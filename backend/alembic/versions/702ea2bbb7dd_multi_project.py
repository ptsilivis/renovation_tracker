"""multi project

Revision ID: 702ea2bbb7dd
Revises: 5d3f3a806a49
Create Date: 2026-07-12 12:01:25.062290
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '702ea2bbb7dd'
down_revision: Union[str, None] = '5d3f3a806a49'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Tables that gain a project_id foreign key.
_SCOPED = [
    "activity", "categories", "cost_items", "moodboard_items", "phases",
    "plan_rooms", "plan_underlays", "plan_walls", "rooms", "surfaces", "tasks",
]

# The default project any pre-existing (single-project) data is moved under.
_DEFAULT_ID = "proj_kampos"


def upgrade() -> None:
    op.create_table('projects',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('sort_order', sa.Integer(), nullable=False),
        sa.Column('created_ts', sa.BigInteger(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )

    # Add project_id everywhere as NULLABLE first, so existing rows survive.
    for table in _SCOPED:
        op.add_column(table, sa.Column('project_id', sa.String(), nullable=True))

    # Data migration: if this DB already holds single-project data, move it all
    # under one default project. A brand-new empty DB skips this entirely and
    # lets app.seed create the sample project instead.
    op.execute(
        f"""
        INSERT INTO projects (id, name, description, sort_order, created_ts)
        SELECT '{_DEFAULT_ID}', 'Kampos',
               'Stone-house renovation in Messinian Mani — the bundled sample project.',
               1, 0
        WHERE EXISTS (SELECT 1 FROM settings WHERE id = 'app')
           OR EXISTS (SELECT 1 FROM categories);
        """
    )
    for table in _SCOPED:
        op.execute(f"UPDATE {table} SET project_id = '{_DEFAULT_ID}' WHERE project_id IS NULL;")
    # Re-key the single global settings row onto the default project.
    op.execute(f"UPDATE settings SET id = '{_DEFAULT_ID}' WHERE id = 'app';")

    # Now enforce NOT NULL + indexes + foreign keys.
    for table in _SCOPED:
        op.alter_column(table, 'project_id', existing_type=sa.String(), nullable=False)
        op.create_index(op.f(f'ix_{table}_project_id'), table, ['project_id'], unique=False)
        op.create_foreign_key(
            f'fk_{table}_project_id', table, 'projects', ['project_id'], ['id'], ondelete='CASCADE'
        )
    op.create_foreign_key('fk_settings_project_id', 'settings', 'projects', ['id'], ['id'], ondelete='CASCADE')


def downgrade() -> None:
    op.drop_constraint('fk_settings_project_id', 'settings', type_='foreignkey')
    op.execute(f"UPDATE settings SET id = 'app' WHERE id = '{_DEFAULT_ID}';")
    for table in _SCOPED:
        op.drop_constraint(f'fk_{table}_project_id', table, type_='foreignkey')
        op.drop_index(op.f(f'ix_{table}_project_id'), table_name=table)
        op.drop_column(table, 'project_id')
    op.drop_table('projects')
