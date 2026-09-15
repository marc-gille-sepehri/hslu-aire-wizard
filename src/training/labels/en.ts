// English catalogue.
//
// ⚠️ IN ARBEIT. Übersetzt sind bisher nur die unten ausdrücklich aufgeführten
// Bereiche; alles Weitere kommt über `...de` herein und ist damit noch Deutsch.
// Der Spread ist eine SICHTBARE Zwischenstufe, kein Rückfallmechanismus: sobald
// alle Bereiche stehen, fällt er weg, und ab dann ist ein fehlender Schlüssel
// wieder ein Bauzeitfehler.
//
// Ton: Sie-Form des Deutschen wird im Englischen zu neutralem „you“ — eine
// Entsprechung gibt es nicht, und gestelztes Englisch wäre die schlechtere
// Annäherung als eine natürliche.

import { de } from './de'
import type { Labels } from './index'

export const en: Labels = {
  ...de,

  catalog: {
    heading: 'Courses & modules',
    intro: 'Pick a course and a module to get started.',
    empty: 'No courses are available at the moment.',
    loadError: 'Courses could not be loaded.',
    inProgress: 'In progress',
    open: 'Open',
    backToCatalog: '← All courses',
    onlyPublished: 'Published only',
    unpublishedTag: 'Unpublished',
    priceTitle: 'List price. Orders are subject to 8.1 % Swiss VAT.',
  },

  dashboard: {
    completedCourses: 'Completed courses',
    ofCourses: (done: number, total: number): string => `${done} of ${total} courses`,
    certificates: 'Certificates',
    inProgressHeading: 'In progress',
    completedTag: 'Completed',
    noStarted: 'No courses started yet — pick one below to begin.',
  },

  seat: {
    title: 'No access to this course',
    noOrder:
      'There is no order from your organisation for this course. Please contact your administrator.',
    noSeats: 'All seats for this course are taken. Please contact your administrator.',
    generic: 'Your progress could not be saved.',
    close: 'Close',
  },

  auth: {
    heading: 'Sign in to the training area',
    intro: 'The training area is protected. Please sign in with your email address.',
    emailLabel: 'Email address',
    emailPlaceholder: 'first.last@hslu.ch',
    requestCode: 'Request code',
    sending: 'Sending code…',
    codeHeading: 'Enter code',
    // „6-stellig“ wird zu „six-digit“: Ziffern im Fliesstext liest man als
    // Daten, und hier ist es ein Eigenschaftswort.
    codeSentTo: (email: string): string =>
      `We have sent a six-digit code to ${email}. It is valid for 10 minutes.`,
    codeLabel: 'Sign-in code',
    codePlaceholder: '123456',
    verify: 'Sign in',
    verifying: 'Checking…',
    back: 'Use a different email address',
    resend: 'Send a new code',
    checking: 'Checking your session…',
    logout: 'Sign out',
    genericRequestError: 'The code could not be sent. Please try again.',
    wrongCode: 'Wrong code. Please try again.',
    // Das deutsche „Versuch(e)“ umgeht den Plural; im Englischen gibt es keinen
    // Grund dazu.
    wrongCodeRemaining: (n: number): string =>
      n === 1 ? 'Wrong code. 1 attempt left.' : `Wrong code. ${n} attempts left.`,
    expiredCode: 'The code is invalid or has expired. Please request a new one.',
    lockedCode: 'Too many attempts. Please request a new code.',
    noUser: 'There is no access for this address.',
    invalidEmail: 'Please enter a valid email address.',
  },

  appTitle: 'Training',
  loading: 'Loading…',
  noModules: 'No modules available.',
  moduleSelectLabel: 'Choose module',
  resetProgress: 'Reset progress',
  resetConfirm: 'Really reset your progress? Answers and notes will be lost.',
  progressOf: (done: number, total: number): string => `${done} / ${total} sections`,
  objectives: 'Objectives',
  prev: 'Back',
  next: 'Next',
  submit: 'Check answer',
  tryAgain: 'Try again',
  correct: 'Correct',
  incorrect: 'Wrong',
  savedHint: 'saved',
  validationError: 'The module JSON is invalid.',
  loadError: 'The module could not be loaded.',
  missingResource: (id: string): string => `Missing resource: ${id}`,
  missingAlt: 'Alt text missing',

  viewAs: {
    open: 'Participant view',
    title: 'Participant view',
    subtitle: 'Look at one participant’s progress.',
    ownView: 'My view',
    noParticipants: 'Nobody has made progress in this course yet.',
    banner: (name: string): string => `Participant view: ${name}`,
    readOnly: 'read-only',
    exit: 'Back to my view',
    loadError: 'Participants could not be loaded.',
    close: 'Close',
  },

  saveError: {
    title: 'Progress not saved',
    body:
      'This block could not be saved on the server. It is not down to anything you entered — you can carry on, but for now this block does not count as done. Please let your course lead know.',
    detail: (artifactId: string, code: string): string => `Block ${artifactId} · ${code}`,
    dismiss: 'Hide',
  },

  llm: {
    title: 'Try a prompt',
    model: 'Model',
    unavailable: 'unavailable',
    promptLabel: 'Prompt',
    promptPlaceholder: 'Write your prompt here …',
    send: 'Send',
    sending: 'Sending …',
    response: 'Response',
    refused: 'The model declined the request.',
    modelsError: 'Models could not be loaded.',
    tokens: (input: number, output: number): string => `${input} → ${output} tokens`,
  },

  routes: {
    notFoundTitle: 'This address leads nowhere',
    notFoundBody:
      'The address points at something that does not (or no longer) exist — or the segments do not match. Please check the link.',
    toCatalog: '← To the course overview',
    resolving: 'Resolving …',
    supersededTitle: 'Superseded version',
    supersededBody: (v: number): string =>
      `You are looking at version ${v}. A newer active version of this course exists.`,
    toActive: 'To the current version',
    courseModules: 'Modules',
    noModules: 'This course has no modules yet.',
    unpublishedTag: 'Unpublished',
    adminOnlyHint:
      'For participants this address is a 404 — they do not see unpublished courses.',
  },

  media: {
    download: 'Download',
    dropHint: 'Drag a file here or click — PDF, Excel, video, image',
    uploading: 'Uploading …',
    uploadError: 'Upload failed.',
    needCourse: 'Uploads need a course context — this module is open without one.',
    remove: 'Remove file',
    orUrl: 'or paste an address',
  },

  mcp: {
    url: 'MCP server URL',
    urlPlaceholder: 'https://…/mcp',
    connect: 'Connect',
    connecting: 'Connecting …',
    connected: 'Connected',
    disconnect: 'Disconnect',
    tools: 'Tools',
    noTools: 'The server reports no tools.',
    selectToolHint: 'Pick a tool on the left to run it.',
    parameters: 'Parameters',
    noParams: 'This tool has no parameters.',
    run: 'Run',
    running: 'Running …',
    result: 'Result',
    error: 'Error',
    required: 'required',
    stepUrl: 'Server connected',
    stepTool: 'Tool run',
    done: 'Done',
    authRequired: 'This server requires sign-in',
    authHint:
      'The provider’s sign-in window will open. Access then runs through our server; your access token stays there and is not kept in the browser.',
    signIn: 'Sign in',
    signingIn: 'Signing in …',
    authFailed: 'Sign-in was cancelled or failed.',
    popupBlocked: 'The sign-in window was blocked. Please allow pop-ups for this site.',
    viaProxy: 'via our server',
    authenticated: 'signed in',
    signOut: 'Sign out',
  },

  ontologyBlock: {
    classes: 'Classes',
    relationships: 'Relationships',
    node: 'Node',
    edge: 'Edge',
    erpCore: 'ERP core',
    extensions: 'Extensions',
    erpTag: 'ERP',
    extensionTag: 'planned',
    attributes: 'Attributes',
    relOut: 'Relationships (outgoing)',
    relIn: 'Relationships (incoming)',
  },

  dataQuery: {
    run: 'Run',
    running: 'Running …',
    hint: '⌘/Ctrl + Enter',
    syntaxToggle: 'Supported syntax',
    syntaxBody:
      'One table (a class from the ontology), no JOINs. WHERE with AND/OR and = != < <= > >= LIKE. Read-only.',
    rowCount: (n: number, coll: string): string => `${n} row${n === 1 ? '' : 's'} from ${coll}`,
    noRows: 'No rows — adjust the conditions.',
  },

  docConvert: {
    drop: 'Drag a file here or click',
    formats: 'PDF, PPTX, DOCX, images → Markdown · Excel → Markdown, cell view + analysis',
    converting: 'Converting …',
    raw: 'Raw text',
    rendered: 'Rendered',
    copyAll: 'Copy all',
    copied: 'Copied ✓',
    tab: { markdown: 'Markdown', cells: 'Cells', analysis: 'Analysis' },
    cellsNotApplicable: 'Cell view does not apply — this file has no table structure.',
    cellsTruncated: 'Output truncated — the file is larger than the display limit.',
    formulaModeLabel: (m: string): string =>
      m === 'formula' ? 'formulas shown' : m === 'error' ? 'error values shown' : 'values only',
  },

  objectGraph: {
    seed: 'Start:',
    hint: 'Click a node to load its neighbours',
    nodeCount: (n: number): string => `${n} nodes`,
    cypherRun: 'Query',
    cypherClear: 'Reset',
    // Die Abfrage bleibt, wie sie ist: die Knotenbezeichner sind Daten aus der
    // Ontologie, keine Beschriftung. Uebersetzt liefe sie ins Leere.
    cypherPlaceholder: 'MATCH (a:Liegenschaft)<-[:liegt_in]-(u:Einheit) RETURN a, u',
    matchCount: (n: number): string => `${n} matches highlighted`,
  },

  chat: {
    title: 'Course assistant',
    subtitle: 'Questions about the course material',
    open: 'Open assistant',
    close: 'Close',
    welcome: 'Hello! I answer questions about the AI@RE course material. What would you like to know?',
    suggestionsTitle: 'Popular questions',
    suggestions: [
      'What is AI readiness?',
      'Explain the Transformation Circle',
      'How does AI help with valuation?',
    ],
    placeholder: 'Type your question …',
    send: 'Send',
    sources: 'Sources',
    disclaimer: 'Answers can be wrong. Please verify anything that matters.',
    error: 'Something went wrong. Please try again.',
  },
  embeddingCompare: {
    title: 'Compare embeddings',
    listHeading: 'Text chunks',
    addPlaceholder: 'Paste a chunk, type one, or drop a text file here …',
    add: 'Add',
    addChunked: (n: number): string => `Split into ${n} chunks`,
    dropHint: 'Drop text or a text file',
    fileTooBig: 'The file is too large — please keep it under 2 MB of text.',
    chunkSize: 'Chunk size',
    chunkOverlap: 'Overlap',
    chars: 'characters',
    chunkHint:
      'Longer text is split as it is added — exactly as in a RAG pipeline, which never sees a '
      + 'document, only its chunks. Cuts are made at paragraph boundaries where possible, '
      + 'otherwise at sentence or word boundaries. The overlap repeats the end of the previous '
      + 'chunk so a statement is not lost at the seam. As a rule of thumb, four characters are '
      + 'roughly one token.',
    splitInto: (n: number): string => `The text you just added was split into ${n} chunks.`,
    chunkBadge: (i: number, total: number): string => `Chunk ${i}/${total}`,
    modePlane: 'Plane',
    modeRetrieve: 'Retrieval',
    modePlaneHint: 'Every chunk against every other — good for a handful of texts.',
    modeRetrieveHint: 'One question against all chunks — this is how RAG searches.',
    tooManyForPlane: (n: number, edges: number): string =>
      `${n} points make ${edges} connecting lines — barely readable.`,
    switchToRetrieve: 'Switch to retrieval',
    queryLabel: 'Question',
    queryPlaceholder: 'What should be found? For example: who pays for maintenance?',
    retrieveAction: 'Retrieve',
    retrieveAgain: 'Retrieve again',
    topK: 'Chunks in context',
    chunks: 'chunks',
    needQuery: 'Write a question first.',
    needOne: 'Select at least one chunk.',
    retrievalDirty: 'The question or the selection changed — retrieve again.',
    cutoff: 'Below this line: not in context',
    contextSummary: (k: number, chars: number, total: number): string =>
      `${k} of ${total} chunks went to the model as context — ${chars} characters in total.`,
    retrievalNote:
      'The model sees only what is above the line. Everything below still exists in the '
      + 'collection and still does not appear in the answer — even when it is correct. This is '
      + 'exactly where the gaps come from that people later blame on the model.',
    colMedium: 'Medium',
    colDescription: 'Description',
    remove: 'Remove',
    selectAll: 'Select all',
    selectOne: 'Select entry',
    removeSelected: 'Remove selected',
    removeSelectedTitle: (n: number): string => `Remove ${n} selected entries`,
    removeSelectedNone: 'Select entries first',
    removeManyConfirm: (n: number): string =>
      `Remove ${n} entries from the media library? The files themselves are kept.`,
    empty: 'No chunks yet. Add two or more to compare them.',
    selectHint: 'Selected chunks are shown as points below.',
    compute: 'Compare',
    computing: 'Computing vectors …',
    recompute: 'Recompute',
    needTwo: 'Select at least two chunks.',
    dirty: 'The selection changed — recompute.',
    modelLine: (model: string, dims: number): string => `${model} · ${dims} dimensions`,
    distanceHint: 'Labels show angular distance: 0 = same direction, 1 = opposite.',
    exact:
      'This picture is exact — three points can always be laid out in a plane without distortion.',
    projected: (pct: string): string =>
      `Projection: from four texts on, the distances no longer fit into a plane without distortion. Distortion ${pct}.`,
    projectedNote:
      'The numbers on the lines are the real distances; the drawn lengths are only the closest possible approximation.',
    error: 'The vectors could not be computed.',
    notConfigured: 'No embedding service is configured for this block yet.',
  },

  agentLoop: {
    blockLabel: 'The agent loop',
    loading: 'Loading …',
    retry: 'Try again',
    loadError: 'Could not be loaded.',

    taskLabel: 'Question for the agent',
    taskPlaceholder: 'e.g. Is the asking price plausible?',
    documentLabel: 'Sales documentation',
    documentHint:
      'Markdown. The agent does not get this text in its context — it fetches the sections with tools. You can paste your own offer; the location data, however, only knows the addresses on file.',
    modelLabel: 'Model',
    start: 'Create run',
    starting: 'Creating …',
    startFailed: 'The run could not be started.',
    whatAgentGets: (n: number): string => `What the agent is given (${n} tools)`,
    systemPrompt: 'System prompt',
    tools: 'Tools',

    newRun: 'New run',
    kModel: 'Model',
    kTurns: 'Turns',
    kTurnsOf: (n: number, max: number): string => `${n} of ${max}`,
    kConversation: 'Conversation',
    kMessages: (n: number): string => `${n} messages`,
    kTokens: 'Tokens',
    kTokensValue: (inTok: string, outTok: string): string => `${inTok} in · ${outTok} out`,
    kResent: 'of that, repeated',

    tabFlow: 'Flow',
    tabLog: (n: number): string => `Log (${n})`,

    cycleModel: 'Ask the model',
    cycleBranch: 'Tool called?',
    cycleTool: 'Run the tool',
    cycleAppend: 'Append the result',
    atStart: 'The run is created. Nothing has been sent to the model yet.',
    atModel: 'The model is thinking — the entire conversation so far goes with it.',
    atAppend:
      'The tool results are now part of the conversation. The next turn sends all of it again.',
    atStopped: 'The ceiling is reached. The agent was stopped — it was not finished.',
    atDone: 'The model answered without calling a tool. That ends the loop.',

    noTurnYet: 'No turn yet.',
    turnN: (n: number): string => `Turn ${n}`,
    seconds: (s: string): string => `${s} s`,
    conversationAtCall: 'Conversation at this call:',
    reasoning: 'Reasoning',
    answerField: 'Answer',
    textBesideCall: 'Text alongside the call',
    toolInput: 'Input',
    toolOutput: 'Output',
    unknownTool:
      'This tool does not exist. The agent gets an error back and may do better on the next turn.',

    outToolUse: 'tool called → continue',
    outFinal: 'no tool → end',
    outMaxTurns: 'ceiling → stopped',
    outError: 'Error',

    stepFirst: 'Run the first turn',
    stepNext: 'Next turn',
    stepRunning: 'Turn running …',
    stepHint: 'One click = one model call. The whole conversation goes with it.',
    stepFailed: 'The turn failed.',
    result: 'Result',
    stoppedNote: (max: number): string =>
      `The ceiling of ${max} turns is reached. The agent was stopped — that is not a result, it is an abort.`,

    noTurnRecorded: 'No turn recorded yet.',
    call: 'Call',
    showInFlow: 'Show in flow',
    turnLoadError: 'The turn could not be loaded.',
    logIntro: (index: number, messages: number, tools: number): string =>
      `The full content of call ${index}: ${messages} ${messages === 1 ? 'message' : 'messages'} plus the system prompt and ${tools} tool declarations. On the next call all of it goes out again — this is the agent's entire memory.`,
  },
  register: {
    title: 'Register',
    titleDone: 'Registration complete',
    close: 'Close',
    firstName: 'First name',
    lastName: 'Last name',
    email: 'Email address',
    emailPlaceholder: 'first.last@company.com',
    company: 'Company',
    street: 'Street',
    streetNumber: 'Number',
    postalCode: 'Postcode',
    city: 'Town',
    country: 'Country',
    countries: { CH: 'Switzerland', DE: 'Germany', AT: 'Austria' },
    submit: 'Register',
    submitting: 'Sending …',
    unreachable: 'The server cannot be reached. Please try again later.',
    doneAccount: (customer: string): string => `Your access for ${customer} has been created.`,
    doneCustomerCreated:
      'Your organisation was not on file yet — you administer it from now on: you can see its users and order courses for it.',
    doneCustomerExisting: 'Your organisation is already on file. You have been added to it as a user.',
    doneInvited:
      'An email about signing in is on its way. There is no password — you enter your address on the sign-in page and receive a code.',
    doneNotInvited:
      'The welcome email could not be delivered. You can still sign in: enter your address and request a code.',
    toLogin: 'Sign in now',
    haveAccount: 'I already have access',
    toSignIn: 'To sign-in',
  },

  profile: {
    title: 'My profile',
    close: 'Close',
    firstName: 'First name',
    lastName: 'Last name',
    email: 'Email',
    roles: 'Roles',
    save: 'Save',
    saving: 'Saving …',
    saved: 'Saved.',
    unreachable: 'The server cannot be reached.',
  },

  agentTrace: {
    blockLabel: 'The agent at work',
    loadingWorkspace: 'Loading the workspace …',
    unreachable: 'The workspace cannot be reached.',
    failed: 'That did not work.',
    start: 'Start a run',
    startAnother: 'Trigger another',
    queuedHint: 'A run is already going. Your trigger is queued — it starts once the first one finishes.',
    noRun: 'No run yet. Pick an agent and start it.',
    killSwitch: 'Emergency stop',
    tabFiles: 'Files and mail',
    tabKnows: 'What I know right now',
    tabTools: 'Tools available',
    tabWhence: 'Where does this come from?',
    intents: 'Intents',
    noIntents: 'Nothing the agent would do yet.',
    readThisRun: 'Read during this run',
    task: 'Task',
    instruction: 'Instruction to the agent',
    edit: 'Edit',
    loadScenario: 'Load scenario',
    deleteWorkspace: 'Delete workspace',
    deleteConfirm: 'Delete all content and the entire run history of this workspace?',
    technical: 'technical view',
    technicalOff: 'technical view off',
    unverifiable: ' (passage not verifiable)',
    wouldDo: '(would do)',
    sees: '(sees)',
    run: 'Run',
    completed: 'completed',
    runningState: 'running',
    nothingYet: 'nothing yet',
  },

  agentForm: {
    titleNew: 'New agent',
    titleEdit: 'Edit agent',
    close: 'Close',
    name: 'Name',
    namePlaceholder: 'Offer reviewer',
    model: 'Model',
    description: 'Description',
    descriptionPlaceholder: 'Reviews incoming offers and proposes a recommendation.',
    instruction: 'Instruction',
    instructionPlaceholder:
      'What should the agent do? Write it the way you would tell a new temp.',
    trigger: 'Trigger',
    triggerFile: 'New file',
    triggerMessage: 'New message',
    triggerTimer: 'On a timer',
    folderPlaceholder: 'Folder',
    subjectPlaceholder: 'Subject contains …',
    minutes: 'minutes',
    toolsRead: 'Sees (actually runs)',
    toolsRecord: 'Would do (recorded only)',
    maxSteps: 'Max. steps',
    enabled: 'enabled',
    save: 'Save',
    deleteAgent: 'Delete agent',
  },

  intentCard: {
    approve: 'Approve',
    reject: 'Reject',
    sendRejection: 'Send rejection',
    beforeAfter: 'Before / after',
  },

  orchestration: {
    loadingToolbox: 'Loading the toolbox …',
    guidancePlaceholder:
      'One rule per line, e.g.\nCheck the reference interest rate before drafting a notice.',
    resetConfirm: 'Reset the toolbox to the starter set? Your own tools will be lost.',
    requestPlaceholder: 'What needs doing? Put it the way you would say it to a person.',
    needTool: 'Create a tool first.',
    promptShown: 'What went to the model',
    promptWould: 'What would go to the model',
    noDescription: 'no description',
    removeTool: 'Remove tool',
    toolNamePlaceholder: 'find_lease',
    toolDescription: 'Description',
    toolDescriptionPlaceholder: 'What does this tool do? One sentence — the model has only this.',
    parameters: 'Parameters',
    noParameters: 'No parameters.',
    paramNamePlaceholder: 'as_of_date',
    paramDescriptionPlaceholder: 'What does this parameter stand for?',
    fromRequest: 'from the request',
    ruleKept: 'kept',
    ruleViolated: 'not kept',
    ruleNotApplicable: 'not applicable — the tool does not appear in the plan',
    ruleUnchecked: 'not verifiable — only the model’s own claim',
    wavesHint: ' — steps on the same level could run at the same time.',
    undeclaredParam: 'This parameter is not declared on the tool.',
    requestLabel: 'Request',
    guidanceLabel: 'Rules',
    toolsLabel: 'Tools',
    toolName: 'Name',
    previewPrompt: 'Preview the prompt (without calling the model)',
    assumptions: 'Assumptions',
    rejectedInvented: 'Rejected: invented tools',
    gaps: 'What the toolbox does not cover',
  },
}
