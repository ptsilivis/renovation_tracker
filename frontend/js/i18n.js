// Bilingual UI chrome. Data strings (task titles, notes) stay in their source
// language; only interface labels translate.
import { state } from './state.js';

const DICT = {
  el: {
    appTitle: 'RenoHub', appSubtitle: 'Παρακολούθηση ανακαίνισης',
    navOverview: 'Επισκόπηση', navTasks: 'Εργασίες', navCosts: 'Κόστη',
    navMoodboard: 'Moodboard', navPlan: 'Κάτοψη', navMeasurements: 'Μετρήσεις',
    logout: 'Έξοδος',

    // login
    loginTitle: 'RenoHub', loginEmail: 'Email', loginPassword: 'Κωδικός',
    loginBtn: 'Σύνδεση', loginError: 'Λάθος email ή κωδικός.',

    // project picker
    pickProject: 'Επιλέξτε έργο', newProject: 'Νέο έργο', projectName: 'Όνομα έργου',
    changeProject: 'Αλλαγή έργου', rename: 'Μετονομασία', confirmDelete: 'Σίγουρα;',

    // change password
    changePassword: 'Αλλαγή κωδικού', currentPassword: 'Τρέχων κωδικός',
    newPassword: 'Νέος κωδικός', confirmPassword: 'Επιβεβαίωση κωδικού',
    pwTooShort: 'Ο κωδικός πρέπει να έχει τουλάχιστον 10 χαρακτήρες.',
    pwMismatch: 'Οι κωδικοί δεν ταιριάζουν.', pwChanged: 'Ο κωδικός άλλαξε.',
    pwSaveErr: 'Αποτυχία αλλαγής κωδικού.',
    mustChangeTitle: 'Ορίστε νέο κωδικό',
    mustChangeMsg: 'Για ασφάλεια, αλλάξτε τον προσωρινό κωδικό πριν συνεχίσετε.',

    // onboarding
    obTitle: 'Ξεκινήστε εδώ', obDismiss: 'Απόκρυψη',
    obIntro: 'Το έργο δημιουργήθηκε με προεπιλεγμένες κατηγορίες και εργασίες. Συμπληρώστε τα βασικά:',
    obSetBudget: 'Ορίστε τον προϋπολογισμό (κάντε κλικ στην κάρτα «Προϋπολογισμός»)',
    obSetTimeline: 'Ρυθμίστε το χρονοδιάγραμμα φάσεων',
    obAddCosts: 'Προσθέστε τις πρώτες δαπάνες στην καρτέλα «Κόστη»',

    // overview
    statBudget: 'Προϋπολογισμός', statSpent: 'Δαπανήθηκε', statRemaining: 'Υπόλοιπο',
    statProgress: 'Πρόοδος εργασιών', editHint: 'Πατήστε για επεξεργασία',
    timeline: 'Χρονοδιάγραμμα φάσεων', today: 'Σήμερα',
    projectRange: 'Διάρκεια έργου', phaseName: 'Όνομα φάσης', addPhase: 'Φάση', newPhase: 'Νέα φάση',
    clearMilestone: 'Κλικ για αφαίρεση ορόσημου', dragReorder: 'Σύρετε για αναδιάταξη',
    ganttHint: 'Σύρετε τις μπάρες για αλλαγή ημερομηνιών, κλικ στη γραμμή για ορόσημο, σύρετε ⠿ για αναδιάταξη.',
    plannedVsActual: 'Προϋπολογισμός vs Πραγματικό', planned: 'Πρόβλεψη', actual: 'Πραγματικό',
    nextTasks: 'Επόμενες εργασίες', recentActivity: 'Πρόσφατη δραστηριότητα',

    // tasks
    manageCategories: 'Διαχείριση κατηγοριών', categoriesTitle: 'Κατηγορίες',
    newCategoryPlaceholder: 'Νέα κατηγορία…', add: 'Προσθήκη', addTask: 'Εργασία',
    colTitle: 'Τίτλος', colStatus: 'Κατάσταση', colPriority: 'Προτεραιότητα',
    colDependency: 'Εξάρτηση', colContractor: 'Συνεργείο', colNotes: 'Σημειώσεις', colCosts: 'Κόστος',
    statusPending: 'Εκκρεμεί', statusInProgress: 'Σε εξέλιξη', statusDone: 'Ολοκληρώθηκε',
    prioHigh: 'Υψηλή', prioMedium: 'Μεσαία', prioLow: 'Χαμηλή',

    // costs
    gridHint: 'Επεξεργασία απευθείας στα κελιά. Οι αλλαγές αποθηκεύονται αυτόματα.',
    colCategory: 'Κατηγορία', colDescription: 'Περιγραφή', colTaskLink: 'Εργασία',
    colPlanned: 'Πρόβλεψη', colActual: 'Πραγματικό', colVariance: 'Διαφορά',
    colDate: 'Ημ/νία', colReceipt: 'Απόδ.', addRow: 'Γραμμή', total: 'Σύνολο',
    statusPaid: 'Πληρωμένο', descriptionPlaceholder: 'Περιγραφή δαπάνης…',
    filterAllCats: 'Όλες οι κατηγορίες', filterAllStatus: 'Όλες οι καταστάσεις',
    noTask: '— καμία —',

    // moodboard
    addIdea: 'Νέα ιδέα', pasteUrlPlaceholder: 'Επικόλληση συνδέσμου (προαιρετικό)…',
    titlePlaceholder: 'Τίτλος ιδέας', commentPlaceholder: 'Σχόλιο…', addPhoto: 'Φωτογραφία',
    save: 'Αποθήκευση', cancel: 'Ακύρωση', allRooms: 'Όλα τα δωμάτια',

    // measurements
    exportJson: 'Εξαγωγή JSON', measurementsHint: 'Διαστάσεις δωματίων & επιφανειών.',
    addSurface: 'Επιφάνεια', addRoom: 'Δωμάτιο', surfFloor: 'Δάπεδο', surfWall: 'Τοίχος', surfOpening: 'Άνοιγμα',
    colLabel: 'Ονομασία', colType: 'Τύπος', colWidth: 'Πλάτος (cm)', colHeight: 'Ύψος (cm)',

    // floor plan
    planHint: 'Σύρετε δωμάτια και τοίχους. Οι αλλαγές αποθηκεύονται αυτόματα.',
    multiSelectHint: 'Shift+κλικ ή σύρσιμο για πολλαπλή επιλογή · Delete για διαγραφή',
    addPlanRoom: 'Δωμάτιο', addPlanWall: 'Τοίχος', addFurniture: 'Έπιπλο', showDims: 'Διαστάσεις',
    save: 'Αποθήκευση', saved: 'Αποθηκεύτηκε', saveHint: 'Οι αλλαγές αποθηκεύονται αυτόματα · συγχρονισμός',
    clearFloor: 'Καθαρισμός ορόφου', confirmClearFloor: 'Διαγραφή όλων των στοιχείων αυτού του ορόφου;',
    walls: 'Τοίχοι', furniture: 'Έπιπλα',
    planEmptyHint: 'Προσθέστε δωμάτια ή εισάγετε αρχείο GLB για να ξεκινήσετε.',
    importGlb: 'Εισαγωγή GLB', scale: 'Κλίμακα', scaleHint: 'Pixel ανά μέτρο — προσαρμόστε στις πραγματικές διαστάσεις', length: 'Μήκος',

    delete: 'Διαγραφή', floor: 'Όροφος', ground: 'Ισόγειο', upper: 'Α΄ όροφος',

    // mobile shell
    mHome: 'Αρχική', mCosts: 'Έξοδα', mAlbum: 'Άλμπουμ', mLoading: 'Φόρτωση δεδομένων…',
    mSpent: 'Δαπάνες', mThisMonth: 'Αυτόν τον μήνα', mVsPlan: 'vs πλάνο',
    mCurrentPhase: 'Τρέχουσα φάση', mUntil: 'έως', mFullTimeline: 'Πλήρες χρονοδιάγραμμα',
    mNextTasks: 'Επόμενες εργασίες', mAll: 'Όλες',
    mNow: 'ΤΩΡΑ', mCompleted: 'Ολοκληρώθηκε',
    mProjectTotal: 'Σύνολο έργου', mPaid: 'Πληρωμένα', mPending: 'Εκκρεμή · πλάνο', mReceipt: 'απόδειξη',
    mAlbumSub: 'Ιδέες και μετρήσεις του σπιτιού.', mIdeas: 'Ιδέες', mMeasures: 'Μετρήσεις',
    mIdeaTag: 'ΙΔΕΑ', mMeasureTag: 'ΜΕΤΡΗΣΗ',
    mAddTitle: 'Νέα καταχώρηση', mAddSub: 'Ό,τι κι αν είσαι μπροστά — 10 δευτερόλεπτα.',
    mExpense: 'Έξοδο', mExpenseSub: 'Ποσό · κατηγορία · περιγραφή',
    mTaskSub: 'Τίτλος · κατηγορία · συνεργείο', mMeasure: 'Μέτρηση', mMeasureSub: 'Διαστάσεις + χώρος',
    mIdea: 'Ιδέα', mIdeaSub: 'Τίτλος ή link στο moodboard',
    mPhoto: 'Φωτογραφία προόδου', mComingSoon: 'Έρχεται σύντομα', mBack: 'Πίσω',
    mNewExpense: 'Νέο έξοδο', mAmountEur: 'ποσό σε €', mSaveExpense: 'Αποθήκευση εξόδου',
    mDescPlaceholder: 'Περιγραφή (π.χ. Σωλήνες & ρακόρ)', mContractorOpt: 'Συνεργείο (προαιρετικό)',
    mNewTask: 'Νέα εργασία', mTaskTitle: 'Τίτλος εργασίας', mSaveTask: 'Αποθήκευση εργασίας',
    mNewMeasure: 'Νέα μέτρηση', mMeasureWhat: 'Τι μετράς; (π.χ. Τοίχος TV)', mSaveMeasure: 'Αποθήκευση μέτρησης', mFromPhone: 'Από κινητό',
    mNewIdea: 'Νέα ιδέα', mIdeaTitle: 'Τίτλος (π.χ. Χρώμα τοίχου RAL 7044)', mIdeaComment: 'Σχόλιο ή link (προαιρετικό)', mSaveIdea: 'Αποθήκευση ιδέας',
    mSavedToProject: 'Αποθηκεύεται στο έργο', mLanguage: 'Γλώσσα',
  },
  en: {
    appTitle: 'RenoHub', appSubtitle: 'Renovation tracker',
    navOverview: 'Overview', navTasks: 'Tasks', navCosts: 'Costs',
    navMoodboard: 'Moodboard', navPlan: 'Floor plan', navMeasurements: 'Measurements',
    logout: 'Log out',

    loginTitle: 'RenoHub', loginEmail: 'Email', loginPassword: 'Password',
    loginBtn: 'Sign in', loginError: 'Wrong email or password.',

    // project picker
    pickProject: 'Choose a project', newProject: 'New project', projectName: 'Project name',
    changeProject: 'Change project', rename: 'Rename', confirmDelete: 'Sure?',

    // change password
    changePassword: 'Change password', currentPassword: 'Current password',
    newPassword: 'New password', confirmPassword: 'Confirm password',
    pwTooShort: 'Password must be at least 10 characters.',
    pwMismatch: 'Passwords do not match.', pwChanged: 'Password changed.',
    pwSaveErr: 'Could not change password.',
    mustChangeTitle: 'Set a new password',
    mustChangeMsg: 'For security, change your temporary password before continuing.',

    // onboarding
    obTitle: 'Getting started', obDismiss: 'Dismiss',
    obIntro: 'Your project was created with default categories and tasks. Fill in the essentials:',
    obSetBudget: 'Set your budget (click the “Budget” card)',
    obSetTimeline: 'Set the phase timeline',
    obAddCosts: 'Add your first costs on the “Costs” tab',

    statBudget: 'Budget', statSpent: 'Spent', statRemaining: 'Remaining',
    statProgress: 'Task progress', editHint: 'Click to edit',
    timeline: 'Phase timeline', today: 'Today',
    projectRange: 'Project span', phaseName: 'Phase name', addPhase: 'Phase', newPhase: 'New phase',
    clearMilestone: 'Click to remove milestone', dragReorder: 'Drag to reorder',
    ganttHint: 'Drag bars to change dates, click a row to set a milestone, drag ⠿ to reorder.',
    plannedVsActual: 'Planned vs Actual', planned: 'Planned', actual: 'Actual',
    nextTasks: 'Next tasks', recentActivity: 'Recent activity',

    manageCategories: 'Manage categories', categoriesTitle: 'Categories',
    newCategoryPlaceholder: 'New category…', add: 'Add', addTask: 'Task',
    colTitle: 'Title', colStatus: 'Status', colPriority: 'Priority',
    colDependency: 'Dependency', colContractor: 'Contractor', colNotes: 'Notes', colCosts: 'Cost',
    statusPending: 'Pending', statusInProgress: 'In progress', statusDone: 'Done',
    prioHigh: 'High', prioMedium: 'Medium', prioLow: 'Low',

    gridHint: 'Edit cells directly. Changes save automatically.',
    colCategory: 'Category', colDescription: 'Description', colTaskLink: 'Task',
    colPlanned: 'Planned', colActual: 'Actual', colVariance: 'Variance',
    colDate: 'Date', colReceipt: 'Rcpt', addRow: 'Row', total: 'Total',
    statusPaid: 'Paid', descriptionPlaceholder: 'Expense description…',
    filterAllCats: 'All categories', filterAllStatus: 'All statuses',
    noTask: '— none —',

    addIdea: 'New idea', pasteUrlPlaceholder: 'Paste a link (optional)…',
    titlePlaceholder: 'Idea title', commentPlaceholder: 'Comment…', addPhoto: 'Photo',
    save: 'Save', cancel: 'Cancel', allRooms: 'All rooms',

    exportJson: 'Export JSON', measurementsHint: 'Room & surface dimensions.',
    addSurface: 'Surface', addRoom: 'Room', surfFloor: 'Floor', surfWall: 'Wall', surfOpening: 'Opening',
    colLabel: 'Label', colType: 'Type', colWidth: 'Width (cm)', colHeight: 'Height (cm)',

    planHint: 'Drag rooms and walls. Changes save automatically.',
    multiSelectHint: 'Shift+click or drag to multi-select · Delete to remove',
    addPlanRoom: 'Room', addPlanWall: 'Wall', addFurniture: 'Furniture', showDims: 'Dimensions',
    save: 'Save', saved: 'Saved', saveHint: 'Changes save automatically · sync now',
    clearFloor: 'Clear floor', confirmClearFloor: 'Delete everything on this floor?',
    walls: 'Walls', furniture: 'Furniture',
    planEmptyHint: 'Add rooms or import a GLB file to begin.',
    importGlb: 'Import GLB', scale: 'Scale', scaleHint: 'Pixels per metre — tune to match real dimensions', length: 'Length',

    delete: 'Delete', floor: 'Floor', ground: 'Ground floor', upper: 'Upper floor',

    // mobile shell
    mHome: 'Home', mCosts: 'Costs', mAlbum: 'Album', mLoading: 'Loading data…',
    mSpent: 'Spent', mThisMonth: 'This month', mVsPlan: 'vs plan',
    mCurrentPhase: 'Current phase', mUntil: 'until', mFullTimeline: 'Full timeline',
    mNextTasks: 'Next tasks', mAll: 'All',
    mNow: 'NOW', mCompleted: 'Completed',
    mProjectTotal: 'Project total', mPaid: 'Paid', mPending: 'Pending · plan', mReceipt: 'receipt',
    mAlbumSub: 'Ideas and measurements of the house.', mIdeas: 'Ideas', mMeasures: 'Measurements',
    mIdeaTag: 'IDEA', mMeasureTag: 'MEASURE',
    mAddTitle: 'New entry', mAddSub: 'Whatever you’re looking at — 10 seconds.',
    mExpense: 'Expense', mExpenseSub: 'Amount · category · description',
    mTaskSub: 'Title · category · contractor', mMeasure: 'Measurement', mMeasureSub: 'Dimensions + room',
    mIdea: 'Idea', mIdeaSub: 'Title or moodboard link',
    mPhoto: 'Progress photo', mComingSoon: 'Coming soon', mBack: 'Back',
    mNewExpense: 'New expense', mAmountEur: 'amount in €', mSaveExpense: 'Save expense',
    mDescPlaceholder: 'Description (e.g. Pipes & fittings)', mContractorOpt: 'Contractor (optional)',
    mNewTask: 'New task', mTaskTitle: 'Task title', mSaveTask: 'Save task',
    mNewMeasure: 'New measurement', mMeasureWhat: 'What are you measuring? (e.g. TV wall)', mSaveMeasure: 'Save measurement', mFromPhone: 'From phone',
    mNewIdea: 'New idea', mIdeaTitle: 'Title (e.g. Wall colour RAL 7044)', mIdeaComment: 'Comment or link (optional)', mSaveIdea: 'Save idea',
    mSavedToProject: 'Saved to the project', mLanguage: 'Language',
  },
};

export function t(key) {
  return (DICT[state.lang] && DICT[state.lang][key]) || DICT.el[key] || key;
}

// Pick a localized name field (categories/phases carry name_el / name_en).
export function localName(obj) {
  if (!obj) return '';
  if (state.lang === 'en' && obj.name_en) return obj.name_en;
  return obj.name_el || obj.name_en || obj.name || '';
}
