// Bilingual UI chrome. Data strings (task titles, notes) stay in their source
// language; only interface labels translate.
import { state } from './state.js';

const DICT = {
  el: {
    appSubtitle: 'Ανακαίνιση εξοχικού · Μάνη',
    navOverview: 'Επισκόπηση', navTasks: 'Εργασίες', navCosts: 'Κόστη',
    navMoodboard: 'Moodboard', navPlan: 'Κάτοψη', navMeasurements: 'Μετρήσεις',
    logout: 'Έξοδος',

    // login
    loginTitle: 'Kampos Hub', loginEmail: 'Email', loginPassword: 'Κωδικός',
    loginBtn: 'Σύνδεση', loginError: 'Λάθος email ή κωδικός.',

    // overview
    statBudget: 'Προϋπολογισμός', statSpent: 'Δαπανήθηκε', statRemaining: 'Υπόλοιπο',
    statProgress: 'Πρόοδος εργασιών', editHint: 'Πατήστε για επεξεργασία',
    timeline: 'Χρονοδιάγραμμα φάσεων', today: 'Σήμερα',
    projectRange: 'Διάρκεια έργου', phaseName: 'Όνομα φάσης', addPhase: 'Φάση', newPhase: 'Νέα φάση',
    clearMilestone: 'Κλικ για αφαίρεση ορόσημου',
    ganttHint: 'Σύρετε τις μπάρες για αλλαγή ημερομηνιών, κλικ στη γραμμή για ορόσημο, ▲▼ για αναδιάταξη.',
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
    addPlanRoom: 'Δωμάτιο', addPlanWall: 'Τοίχος', showDims: 'Διαστάσεις',
    planEmptyHint: 'Προσθέστε δωμάτια ή εισάγετε αρχείο GLB για να ξεκινήσετε.',
    importGlb: 'Εισαγωγή GLB',

    delete: 'Διαγραφή', floor: 'Όροφος', ground: 'Ισόγειο', upper: 'Α΄ όροφος',
  },
  en: {
    appSubtitle: 'Summer-house renovation · Mani',
    navOverview: 'Overview', navTasks: 'Tasks', navCosts: 'Costs',
    navMoodboard: 'Moodboard', navPlan: 'Floor plan', navMeasurements: 'Measurements',
    logout: 'Log out',

    loginTitle: 'Kampos Hub', loginEmail: 'Email', loginPassword: 'Password',
    loginBtn: 'Sign in', loginError: 'Wrong email or password.',

    statBudget: 'Budget', statSpent: 'Spent', statRemaining: 'Remaining',
    statProgress: 'Task progress', editHint: 'Click to edit',
    timeline: 'Phase timeline', today: 'Today',
    projectRange: 'Project span', phaseName: 'Phase name', addPhase: 'Phase', newPhase: 'New phase',
    clearMilestone: 'Click to remove milestone',
    ganttHint: 'Drag bars to change dates, click a row to set a milestone, ▲▼ to reorder.',
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
    addPlanRoom: 'Room', addPlanWall: 'Wall', showDims: 'Dimensions',
    planEmptyHint: 'Add rooms or import a GLB file to begin.',
    importGlb: 'Import GLB',

    delete: 'Delete', floor: 'Floor', ground: 'Ground floor', upper: 'Upper floor',
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
