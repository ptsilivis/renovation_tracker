"""user must_change_password + project scaffolding

Revision ID: 77bf2f8fe768
Revises: 702ea2bbb7dd
Create Date: 2026-07-12 17:02:17.832014
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '77bf2f8fe768'
down_revision: Union[str, None] = '702ea2bbb7dd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Existing users default to False (they already have working passwords);
    # newly seeded accounts get True from app.seed.
    op.add_column(
        'users',
        sa.Column('must_change_password', sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.alter_column('users', 'must_change_password', server_default=None)


def downgrade() -> None:
    op.drop_column('users', 'must_change_password')
