window.__ModuleLoader__.load({
  id: '@local/dsh-local-superagent',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const NS = 'localSuperagent'
    const PANEL_ID = 'local-superagent'
    const ROUTE = 'api/local-superagent/invoke'

    const dictionaries = {
      en: {
        panel: 'Superagent',
        title: 'Local Superagent',
        subtitle: 'Place tasks in a local workspace: the superagent dispatches them to worker sessions, reviews the result and keeps them moving, and only interrupts you when a decision is really needed.',
        loading: 'Loading the board…',
        refresh: 'Refresh',
        refreshing: 'Refreshing…',
        settings: 'Settings',
        close: 'Close',
        cancel: 'Cancel',
        save: 'Save',
        saving: 'Saving…',
        dismiss: 'Dismiss',
        offlineTitle: 'Cannot reach the Host',
        offlineHelp: 'Make sure DSH and this plugin are running, then try again.',
        offlineRetry: 'Reconnect',
        errorOffline: 'The Local Superagent Host half is unreachable. It may still be starting.',
        errorTransport: 'The request failed.',
        errorForbidden: 'Not permitted: only the local owner can use this board.',
        errorInvalid: 'The Host rejected the request as invalid.',
        errorUnknownAction: 'The Host does not know this action.',
        errorInternal: 'The Host reported an internal error.',
        actionFailed: 'Action failed',
        metricRunning: 'Running',
        metricQueued: 'Queued',
        metricNeedsYou: 'Needs you',
        metricDone: 'Done',
        metricCapacity: 'Concurrency',
        pausedHint: 'Pauses new dispatches for all Superagents; existing worker sessions continue.',
        pause: 'Pause all',
        resume: 'Resume all',
        pausedNotice: 'Dispatching paused',
        resumedNotice: 'Dispatching resumed',
        workspaces: 'Workspaces',
        allWorkspaces: 'All workspaces',
        workspaceCount: '{n} workspaces',
        addWorkspace: 'Add workspace',
        addWorkspaceHint: 'Enter an absolute local path, for example D:\\workspace.',
        workspacePath: 'Local path',
        workspacePathPlaceholder: 'D:\\workspace',
        workspaceTitle: 'Title (optional)',
        workspaceTitlePlaceholder: 'e.g. my-workspace',
        workspaceAdd: 'Add',
        workspaceAdding: 'Adding…',
        workspacePathInvalid: 'Enter an absolute local path (for example D:\\workspace or \\\\server\\share).',
        workspaceAdded: 'Workspace added',
        noWorkspaces: 'No workspace yet',
        noWorkspacesHint: 'Add a local workspace (absolute path) before placing a task.',
        workspaceEmpty: 'No task in the current scope',
        workspaceEmptyHint: 'Use “+ New task” above to hand over the first one.',
        newTask: '+ New task',
        collapse: 'Collapse',
        composerHint: 'The title and goal go straight to the worker session: say what to do and how to tell it is done.',
        taskTitle: 'Title',
        taskTitlePlaceholder: 'One line on what to do',
        taskGoal: 'Goal / requirements',
        taskGoalPlaceholder: 'Outcome, scope, constraints, reference files…',
        taskAcceptance: 'Acceptance (optional)',
        taskAcceptancePlaceholder: 'What counts as done, and how to verify it',
        priority: 'Priority',
        priorityLow: 'Low',
        priorityNormal: 'Normal',
        priorityHigh: 'High',
        taskWorkspace: 'Workspace',
        taskSubmit: 'Queue task',
        taskSubmitting: 'Queuing…',
        taskAdded: 'Task queued',
        taskTitleRequired: 'Enter a title.',
        taskGoalRequired: 'Enter the goal.',
        taskTitleTooLong: 'Title is limited to 200 characters.',
        taskGoalTooLong: 'Goal is limited to 8000 characters.',
        taskAcceptanceTooLong: 'Acceptance is limited to 4000 characters.',
        taskWorkspaceRequired: 'Choose a workspace first.',
        statusQueued: 'Queued',
        statusRunning: 'Running',
        statusReviewing: 'Supervisor review',
        statusNeedsYou: 'Needs you',
        statusDone: 'Done',
        statusFailed: 'Failed',
        statusCancelled: 'Stopped',
        columnQueued: 'Queued',
        columnRunning: 'In progress',
        columnEnded: 'Finished',
        columnEmpty: 'Nothing here',
        filterLabel: 'Filter finished tasks',
        filterAll: 'All',
        endedEmpty: 'No finished task matches this filter.',
        needsYouTitle: 'Needs your decision',
        needsYouHint: 'The supervisor is waiting for your answer and continues once you reply.',
        question: 'Question from the supervisor',
        answerLabel: 'Your answer',
        answerPlaceholder: 'Answer the question; it goes straight to the worker session.',
        submitAnswer: 'Submit answer',
        submittingAnswer: 'Submitting…',
        answered: 'Answer submitted',
        noQuestion: 'No question was recorded.',
        viewDetail: 'Details',
        runningFor: 'Running for',
        waitingFor: 'Waiting for',
        took: 'Took',
        detailTitle: 'Task details',
        closeDetail: 'Close details',
        createdAt: 'Created',
        startedAt: 'Started',
        finishedAt: 'Finished',
        attempts: 'Attempts',
        workspace: 'Workspace',
        goal: 'Goal / requirements',
        acceptance: 'Acceptance',
        noAcceptance: 'No acceptance criteria were given.',
        report: 'Worker report',
        noReport: 'The worker session has not reported yet.',
        deliverables: 'Deliverables',
        noDeliverables: 'No deliverables were listed.',
        review: 'Supervisor review',
        noReview: 'The supervisor has not decided yet.',
        progressLog: 'Progress log',
        progressLogHint: 'Chronological order; the newest entry is last.',
        noProgress: 'No progress entries yet.',
        session: 'Worker session',
        sessionCopy: 'Copy',
        sessionCopied: 'Copied',
        sessionCopyFailed: 'Copy failed; the text is selected, copy it manually.',
        noSession: 'No worker session yet.',
        answerSection: 'Answer the supervisor',
        stateReady: 'Ready',
        stateNeedsDecision: 'Needs decision',
        stateBlocked: 'Blocked',
        stateFailed: 'Failed',
        verdictDone: 'Approved',
        verdictContinue: 'Continue',
        verdictNeedsYou: 'Needs you',
        verdictFail: 'Rejected',
        settingsTitle: 'Board settings',
        maxWorkers: 'Workers per supervisor (global)',
        maxWorkersHint: 'Worker concurrency per supervisor (1–4), configured uniformly for every Superagent; not a shared global pool.',
        autoReview: 'Automatic review',
        autoReviewHint: 'After a worker reports, the supervisor reviews it and decides the next step.',
        supervisor: 'Supervisor session',
        supervisorRunning: 'running',
        supervisorIdle: 'idle',
        stateDir: 'State directory',
        version: 'Version',
        settingsSaved: 'Settings saved',
        deleteTask: 'Delete',
        deleting: 'Deleting…',
        deleted: 'Task deleted',
        confirmDelete: 'Delete this task?',
        confirmDeleteHint: 'It is removed from the board and its record; this cannot be undone.',
        confirmDeleteYes: 'Delete',
        retryTask: 'Retry',
        retrying: 'Retrying…',
        retried: 'Queued again',
        stop: 'Stop',
        stopping: 'Stopping…',
        stopped: 'Stop requested',
        allSettled: 'All tasks are finished',
        allSettledHint: 'Nothing is queued or running; place a new task to continue.',
        noTasks: 'No task yet',
        noTasksHint: 'Pick a workspace and use “+ New task” to begin.',
      },
      zh: {
        panel: 'Superagent',
        title: '本地 Superagent',
        subtitle: '在本机工作区布置任务：Superagent 自动派发给执行会话、审查结果并推进；只有真正需要你决定时才打扰你。',
        loading: '正在加载看板…',
        refresh: '刷新',
        refreshing: '刷新中…',
        settings: '设置',
        close: '关闭',
        cancel: '取消',
        save: '保存',
        saving: '保存中…',
        dismiss: '知道了',
        offlineTitle: '暂时连不上 Host',
        offlineHelp: '确认 DSH 与插件已启动后再试。',
        offlineRetry: '重试连接',
        errorOffline: '无法连接本地 Superagent 的 Host 半；插件可能仍在启动。',
        errorTransport: '网络请求失败。',
        errorForbidden: '权限不足：只有本机所有者可以使用这块看板。',
        errorInvalid: 'Host 判定请求无效。',
        errorUnknownAction: 'Host 不认识这个操作。',
        errorInternal: 'Host 内部错误。',
        actionFailed: '操作失败',
        metricRunning: '运行中',
        metricQueued: '排队',
        metricNeedsYou: '待你决定',
        metricDone: '已完成',
        metricCapacity: '并发上限',
        pausedHint: '统一暂停所有 Superagent 的新派发，已有执行会话继续。',
        pause: '暂停全部',
        resume: '恢复全部',
        pausedNotice: '已暂停派发',
        resumedNotice: '已恢复派发',
        workspaces: '工作区',
        allWorkspaces: '全部工作区',
        workspaceCount: '{n} 个工作区',
        addWorkspace: '添加工作区',
        addWorkspaceHint: '输入本机已有的绝对路径，例如 D:\\workspace。',
        workspacePath: '本机路径',
        workspacePathPlaceholder: 'D:\\workspace',
        workspaceTitle: '标题（可选）',
        workspaceTitlePlaceholder: '例如 my-workspace',
        workspaceAdd: '添加',
        workspaceAdding: '添加中…',
        workspacePathInvalid: '请输入本机绝对路径（如 D:\\workspace 或 \\\\server\\share）。',
        workspaceAdded: '工作区已添加',
        noWorkspaces: '还没有工作区',
        noWorkspacesHint: '先添加一个本机工作区（绝对路径），之后才能布置任务。',
        workspaceEmpty: '当前范围没有任务',
        workspaceEmptyHint: '使用上方的「＋ 布置任务」，把第一件事交给它。',
        newTask: '＋ 布置新任务',
        collapse: '收起',
        composerHint: '标题和目标会直接交给执行会话：写清楚要做什么、怎样算做完。',
        taskTitle: '标题',
        taskTitlePlaceholder: '一句话说明要做什么',
        taskGoal: '目标 / 要求',
        taskGoalPlaceholder: '要达成的效果、范围、约束、参考文件…',
        taskAcceptance: '验收条件（可选）',
        taskAcceptancePlaceholder: '怎样算完成，用什么方式验证',
        priority: '优先级',
        priorityLow: '低',
        priorityNormal: '普通',
        priorityHigh: '高',
        taskWorkspace: '属地工作区',
        taskSubmit: '加入队列',
        taskSubmitting: '提交中…',
        taskAdded: '已加入队列',
        taskTitleRequired: '请填写标题。',
        taskGoalRequired: '请填写目标 / 要求。',
        taskTitleTooLong: '标题最多 200 字。',
        taskGoalTooLong: '目标最多 8000 字。',
        taskAcceptanceTooLong: '验收条件最多 4000 字。',
        taskWorkspaceRequired: '先选择一个工作区。',
        statusQueued: '待接单',
        statusRunning: '进行中',
        statusReviewing: '主管审查中',
        statusNeedsYou: '待你决定',
        statusDone: '已完成',
        statusFailed: '失败',
        statusCancelled: '已停止',
        columnQueued: '待接单',
        columnRunning: '进行中',
        columnEnded: '已结束',
        columnEmpty: '暂无任务',
        filterLabel: '筛选已结束任务',
        filterAll: '全部',
        endedEmpty: '没有符合条件的已结束任务。',
        needsYouTitle: '待你决定',
        needsYouHint: '主管停在这里等你回答；回答后会继续推进。',
        question: '主管的问题',
        answerLabel: '你的回答',
        answerPlaceholder: '回答这个问题；内容会直接交给执行会话继续。',
        submitAnswer: '提交回答',
        submittingAnswer: '提交中…',
        answered: '回答已提交',
        noQuestion: '没有记录到问题。',
        viewDetail: '详情',
        runningFor: '已运行',
        waitingFor: '已等待',
        took: '耗时',
        detailTitle: '任务详情',
        closeDetail: '关闭详情',
        createdAt: '创建',
        startedAt: '开始',
        finishedAt: '结束',
        attempts: '尝试次数',
        workspace: '工作区',
        goal: '目标 / 要求',
        acceptance: '验收条件',
        noAcceptance: '没有填写验收条件。',
        report: '执行报告',
        noReport: '执行会话还没有汇报。',
        deliverables: '交付物',
        noDeliverables: '没有列出交付物。',
        review: '主管审查',
        noReview: '主管还没有给出审查结论。',
        progressLog: '进度日志',
        progressLogHint: '按时间正序，最新在底部。',
        noProgress: '还没有进度记录。',
        session: '执行会话',
        sessionCopy: '复制',
        sessionCopied: '已复制',
        sessionCopyFailed: '复制失败，已选中文本，可手动复制。',
        noSession: '还没有分配执行会话。',
        answerSection: '回答主管',
        stateReady: '已完成',
        stateNeedsDecision: '需要决定',
        stateBlocked: '受阻',
        stateFailed: '失败',
        verdictDone: '通过',
        verdictContinue: '继续',
        verdictNeedsYou: '需要你',
        verdictFail: '不通过',
        settingsTitle: '看板设置',
        maxWorkers: '每位主管并发上限（统一）',
        maxWorkersHint: '每位主管的执行并发上限（1–4，统一设置），不是所有主管共用一个总池。',
        autoReview: '自动审查',
        autoReviewHint: '执行会话汇报后，主管自动审查并决定下一步。',
        supervisor: '主管会话',
        supervisorRunning: '运行中',
        supervisorIdle: '空闲',
        stateDir: '状态目录',
        version: '版本',
        settingsSaved: '设置已保存',
        deleteTask: '删除',
        deleting: '删除中…',
        deleted: '任务已删除',
        confirmDelete: '确定删除这个任务？',
        confirmDeleteHint: '删除后会从看板和记录中移除，无法恢复。',
        confirmDeleteYes: '确认删除',
        retryTask: '重试',
        retrying: '重试中…',
        retried: '已重新排队',
        stop: '停止',
        stopping: '停止中…',
        stopped: '已请求停止',
        allSettled: '所有任务都已结束',
        allSettledHint: '没有排队或进行中的任务；布置新任务即可继续。',
        noTasks: '还没有任务',
        noTasksHint: '选一个工作区，点「＋ 布置新任务」开始。',
      },
    }
    // Extra strings for the redesigned panel.
    Object.assign(dictionaries.en, {
      searchPlaceholder: 'Search tasks…',
      searchClear: 'Clear search',
      clearSearch: 'Clear search',
      noSearchResults: 'No matching task',
      noSearchResultsHint: 'Try another keyword, or clear the search.',
      overview: 'Overview',
      latestProgress: 'Latest progress',
      answersHint: 'Enter to submit · Shift+Enter for a new line',
      queueHint: 'Ctrl / ⌘ + Enter to queue',
      supervisorUnavailable: 'not started',
      supervisorLabel: 'Supervisor',
      attemptShort: 'Attempt {n}',
      taskCount: '{n} task(s)',
      confirmStop: 'Stop this task?',
      confirmStopHint: 'The running worker session will be interrupted. The task stays on the board as stopped.',
      confirmStopYes: 'Stop task',
      openTask: 'Open task details',
      needsYouBadge: '{n} waiting',
      priorityLabel: 'Priority',
      newTaskSection: 'Hand over a task',
      addWorkspaceSection: 'Add a local workspace',
      answerHint: 'The supervisor is waiting; your answer goes straight to the worker session.',
      noAnswer: 'Write an answer first.',
      descReport: 'Result reported by the worker session',
      descReview: 'Verdict from the supervisor',
      descProgress: 'Everything that happened, oldest first',
      taskQueuedHint: 'It will be dispatched as soon as a worker slot is free.',
      refreshHint: 'Reload the board',
      pauseHint: 'Stop dispatching new tasks',
      settingsHint: 'Concurrency and review',
      workerSession: 'Worker session',
      newTaskShort: 'New task',
      workspaceLabel: 'Workspace',
      supervisorNeverRun: 'idle until the first review',
      kindCreate: 'Created',
      kindDispatch: 'Dispatched',
      kindReport: 'Report',
      kindReview: 'Review',
      kindAnswer: 'Answer',
      kindError: 'Error',
      kindTimeout: 'Timeout',
      kindRecover: 'Recovered',
      kindRetry: 'Retried',
      kindStop: 'Stopped',
      startedLabel: 'Started',
    })
    Object.assign(dictionaries.zh, {
      searchPlaceholder: '搜索任务…',
      searchClear: '清除搜索',
      clearSearch: '清除搜索',
      noSearchResults: '没有匹配的任务',
      noSearchResultsHint: '换个关键词，或清除搜索。',
      overview: '概览',
      latestProgress: '最新进展',
      answersHint: 'Enter 提交 · Shift+Enter 换行',
      queueHint: 'Ctrl / ⌘ + Enter 提交',
      supervisorUnavailable: '未启动',
      supervisorLabel: '主管',
      attemptShort: '第 {n} 轮',
      taskCount: '{n} 个任务',
      confirmStop: '停止这个任务？',
      confirmStopHint: '正在运行执行会话会被中断；任务会以「已停止」留在看板上。',
      confirmStopYes: '停止任务',
      openTask: '打开任务详情',
      needsYouBadge: '{n} 个待回答',
      priorityLabel: '优先级',
      newTaskSection: '布置任务',
      addWorkspaceSection: '添加本机工作区',
      answerHint: '主管正在等你；回答会直接交给执行会话继续。',
      noAnswer: '先写一个回答。',
      descReport: '执行会话汇报的结果',
      descReview: '主管给出的审查结论',
      descProgress: '按发生顺序排列，最早在前',
      taskQueuedHint: '有空闲执行位就会自动派发。',
      refreshHint: '重新读取看板',
      pauseHint: '停止派发新任务',
      settingsHint: '并发与审查',
      workerSession: '执行会话',
      newTaskShort: '布置任务',
      workspaceLabel: '工作区',
      supervisorNeverRun: '第一次审查前保持空闲',
      kindCreate: '创建',
      kindDispatch: '派发',
      kindReport: '报告',
      kindReview: '审查',
      kindAnswer: '回答',
      kindError: '错误',
      kindTimeout: '超时',
      kindRecover: '恢复',
      kindRetry: '重试',
      kindStop: '停止',
      startedLabel: '开始',
    })
    // Model configuration strings.
    Object.assign(dictionaries.en, {
      modelsSection: 'Models',
      supervisorModel: 'Superagent model',
      supervisorModelHint: 'Model used by the supervisor session that reviews worker reports. “Follow DSH default” keeps the deployment default.',
      followDefault: 'Follow DSH default',
      workerModels: 'Worker model range',
      workerModelsHint: 'The superagent may choose any of these models for a worker session; the first one is the default. Select none to inherit the globally configured Superagent model.',
      workerModel: 'Worker model',
      refreshModels: 'Reload models',
      modelsLoading: 'Loading models…',
      modelsEmpty: 'No model is currently available.',
      modelsUnavailable: 'The model catalog is unavailable; the current selection is kept.',
      modelDefaultTag: 'default',
      setAsDefault: 'Make default',
      savingModels: 'Saving models…',
      scopeModelsLabel: 'Model range',
    })
    Object.assign(dictionaries.zh, {
      modelsSection: '模型',
      supervisorModel: 'Superagent 模型',
      supervisorModelHint: '主管会话（审查执行结果）使用的模型；「跟随 DSH 默认」表示使用部署默认模型。',
      followDefault: '跟随 DSH 默认',
      workerModels: '工作代理模型范围',
      workerModelsHint: 'Superagent 可从这些模型里为执行会话选择；第一个是默认执行模型。全部不选则继承全局 Superagent 模型。',
      workerModel: '执行模型',
      refreshModels: '重新读取模型',
      modelsLoading: '正在读取模型…',
      modelsEmpty: '当前没有可用模型。',
      modelsUnavailable: '模型目录暂不可用，保留当前选择。',
      modelDefaultTag: '默认',
      setAsDefault: '设为默认',
      savingModels: '正在保存模型…',
      scopeModelsLabel: '模型范围',
    })

    Object.assign(dictionaries.en, {
      panelCrashed: 'The Superagent panel could not render.',
      globalSettings: 'Global settings · All Superagents', globalSettingsReload: 'Reload or upgrade the Host for global settings. No settings will be changed on this older Host.',
      createSuperagentShort: 'Create', superagentActions: 'Superagent actions', confirmSuperagentRemoval: 'Remove “{name}”?', compactSubtitle: 'Delegate · Review · Deliver',
      superagents: 'Superagents', allSuperagents: 'Aggregate view', selectSuperagent: 'Select a Superagent to change settings.',
      addSuperagent: 'Create Superagent', renameSuperagent: 'Rename', removeSuperagent: 'Remove Superagent',
      superagentTitle: 'Superagent name', superagentRequired: 'Choose the responsible Superagent.',
      superagentSaved: 'Superagent saved', superagentRemoved: 'Superagent removed', noSuperagents: 'No Superagent in this workspace yet.',
      scopedSettings: 'Settings for', aggregateHint: 'Aggregate view is read-only for settings. Select one supervisor below.',
      legacyHint: 'This Host has no multi-Superagent data. Tasks remain readable; upgrade the Host before managing supervisors.',
      historicalSuperagent: 'Historical / removed supervisor', legacySuperagent: 'Legacy supervisor (unassigned)',
      inheritSupervisor: 'Inherit Superagent model', autonomy: 'Supervisor autonomy after waiting',
      autonomyHint: 'Off by default. One automatic supervisor attempt per task after the wait; a human answer or retry resets it. Decisions stay within the original authorization, never bypassing login, payment, required approvals or human-only operations.',
      waitMinutes: 'Wait minutes (1–1440)', waitInvalid: 'Enter a whole number from 1 to 1440.',
      waitingLabel: 'Waiting for your decision', answerEntry: 'Answer in details', humanWaiting: 'Waiting for a human answer',
      autonomyCountdown: 'Supervisor review in {time}', autonomyDue: 'Waiting for supervisor review', autonomyAttempted: 'Supervisor tried; still needs you',
      removeSuperagentHint: 'Open tasks prevent removal. Finished tasks keep their supervisor identity.',
      confirmRemoveSuperagent: 'Confirm removal', nameRequired: 'Enter a name (up to 120 characters).',
    })
    Object.assign(dictionaries.zh, {
      panelCrashed: 'Superagent 面板渲染出错。',
      globalSettings: '全局设置 · 适用于所有 Superagent', globalSettingsReload: '请重载或升级 Host 以使用全局设置；当前旧版 Host 不允许修改，避免误用。',
      createSuperagentShort: '创建', superagentActions: '主管操作', confirmSuperagentRemoval: '确定移除「{name}」？', compactSubtitle: '派发 · 审查 · 交付',
      superagents: 'Superagent 管理', allSuperagents: '聚合视图', selectSuperagent: '请选择一个 Superagent 后修改设置。',
      addSuperagent: '创建 Superagent', renameSuperagent: '重命名', removeSuperagent: '移除 Superagent',
      superagentTitle: 'Superagent 名称', superagentRequired: '请选择负责此任务的 Superagent。',
      superagentSaved: 'Superagent 已保存', superagentRemoved: 'Superagent 已移除', noSuperagents: '此工作区还没有 Superagent。',
      scopedSettings: '设置仅作用于', aggregateHint: '聚合视图仅汇总任务，不修改设置。请在下方选择一个主管。',
      legacyHint: '当前 Host 尚无多主管数据。可继续查看旧任务；管理主管前请升级 Host。',
      historicalSuperagent: '历史 / 已移除主管', legacySuperagent: '旧版主管（未分配）',
      inheritSupervisor: '继承 Superagent 模型', autonomy: '等待后由主管自主拍板',
      autonomyHint: '默认关闭。等待到期后每任务最多自动尝试一次主管决策，人工回答或重试才重置。仅限原授权范围，不能绕过登录、付款、必须人工批准及其他必须由人完成的操作。',
      waitMinutes: '等待分钟数（1–1440）', waitInvalid: '请输入 1 到 1440 的整数。',
      waitingLabel: '等待你的决定', answerEntry: '进入详情回答', humanWaiting: '等待人工回答',
      autonomyCountdown: '{time} 后主管审查', autonomyDue: '等待主管审查', autonomyAttempted: '主管已尝试，仍需你回答',
      removeSuperagentHint: '有未结束任务时不能移除；已结束任务保留原主管身份。',
      confirmRemoveSuperagent: '确认移除', nameRequired: '请填写名称（最多 120 字）。',
    })

    /* --------------------------------------------------------------------- */
    /* icons                                                                 */
    /* --------------------------------------------------------------------- */

    const ICON_PATHS = {
      brand: 'M4 5.5h6.5v5H4zM13.5 5.5H20v5h-6.5zM4 13.5h6.5v5H4zM14.8 15.6l1.9 1.9 3.9-3.9',
      plus: 'M12 5v14M5 12h14',
      refresh: 'M20.5 12a8.5 8.5 0 11-2.6-6.1M20.5 4.5v5.5H15',
      settings: 'M12 15.2a3.2 3.2 0 100-6.4 3.2 3.2 0 000 6.4zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 008.4 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 8.4a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z',
      pause: 'M9 5v14M15 5v14',
      play: 'M8 5l11 7-11 7z',
      clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7.5V12l3 1.8',
      check: 'M20 6.5L9.2 17.3 4 12.1',
      alert: 'M12 9v4M12 17.2h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z',
      help: 'M12 21a9 9 0 100-18 9 9 0 000 18zM9.1 9.2a2.9 2.9 0 015.8 0c0 1.9-2.9 2.2-2.9 4M12 17.2h.01',
      chevronRight: 'M9.5 6l6 6-6 6',
      chevronDown: 'M6 9.5l6 6 6-6',
      close: 'M6 6l12 12M18 6L6 18',
      trash: 'M4 7h16M9 7V5h6v2M6.5 7l.9 13h9.2l.9-13M10 11v5.5M14 11v5.5',
      retry: 'M3.5 12a8.5 8.5 0 109-8.5 8.5 8.5 0 00-6 2.5L3.5 8.5M3.5 3.5v5h5',
      stop: 'M7.5 7.5h9v9h-9z',
      folder: 'M3 7.5A2.5 2.5 0 015.5 5h3.6l2 2h7.4A2.5 2.5 0 0121 9.5v7A2.5 2.5 0 0118.5 19h-13A2.5 2.5 0 013 16.5z',
      search: 'M11 18.5a7.5 7.5 0 100-15 7.5 7.5 0 000 15zM20.5 20.5l-4.2-4.2',
      sparkle: 'M12 3.5l1.8 4.9 4.9 1.8-4.9 1.8L12 16.9l-1.8-4.9L5.3 10.2l4.9-1.8zM18.8 15.4l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z',
      copy: 'M9 9.5h10.5V20H9zM5 15V4.5h10.5',
      send: 'M21.5 2.5L11 13M21.5 2.5l-6.8 19-3.7-8.5-8.5-3.7z',
      arrowRight: 'M4.5 12h15M13.5 6l6 6-6 6',
      bolt: 'M13.5 2.5L4.5 14h5.5l-1 7.5L18 10h-5.5z',
      info: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 10.5V17M12 7.5h.01',
      layers: 'M12 3l9 4.5-9 4.5-9-4.5zM3 12l9 4.5 9-4.5M3 16.5L12 21l9-4.5',
      list: 'M8.5 6h12M8.5 12h12M8.5 18h12M3.5 6h.01M3.5 12h.01M3.5 18h.01',
      dot: 'M12 12m-4 0a4 4 0 108 0 4 4 0 10-8 0',
    }

    const ICON_FILLED = new Set(['play', 'stop', 'bolt', 'sparkle'])

    function Icon({ name = 'dot', size = 18, strokeWidth = 1.7, className }) {
      const path = ICON_PATHS[name] || ICON_PATHS.dot
      const filled = ICON_FILLED.has(name)
      return h('svg', {
        className: className ? 'lsa-icon ' + className : 'lsa-icon',
        width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true,
        fill: filled ? 'currentColor' : 'none',
        stroke: filled ? 'none' : 'currentColor',
        strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round',
      }, h('path', { d: path }))
    }

    function Spinner({ size = 14 }) {
      return h('span', { className: 'lsa-spinner', style: { width: size, height: size }, 'aria-hidden': true })
    }

    /* --------------------------------------------------------------------- */
    /* styles                                                                */
    /* --------------------------------------------------------------------- */

    const css = `
      .lsa-page {
        box-sizing: border-box; height: 100%; overflow: auto;
        color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-base);
        font-family: var(--dsw-font-family, ui-sans-serif, system-ui, sans-serif);
        font-size: 13px; line-height: 1.5;
        -webkit-font-smoothing: antialiased;
      }
      .lsa-page *, .lsa-page *::before, .lsa-page *::after { box-sizing: border-box; }
      .lsa-page [hidden] { display: none !important; }
      .lsa-page h1, .lsa-page h2, .lsa-page h3, .lsa-page h4, .lsa-page p { margin: 0; }
      .lsa-page button { font: inherit; color: inherit; cursor: pointer; }
      .lsa-page :focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: 2px; border-radius: 6px; }
      .lsa-icon { display: block; flex: none; }
      .lsa-sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }

      /* shell */
      .lsa-shell { max-width: 1400px; margin: 0 auto; padding: 0 22px 64px; container-type: inline-size; container-name: lsaboard; }

      /* top bar */
      .lsa-topbar {
        position: sticky; top: 0; z-index: 30;
        display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
        margin: 0 -22px; padding: 10px 22px;
        background: color-mix(in srgb, var(--dsw-alias-bg-base) 86%, transparent);
        backdrop-filter: blur(14px);
        border-bottom: 1px solid var(--dsw-alias-border-l3);
      }
      .lsa-brand { display: flex; align-items: center; gap: 9px; min-width: 0; }
      .lsa-logo {
        display: grid; place-items: center; flex: none; width: 30px; height: 30px; border-radius: 9px;
        color: var(--dsw-alias-label-primary-foreground); background: var(--dsw-alias-state-business-primary);
        box-shadow: 0 3px 10px color-mix(in srgb, var(--dsw-alias-state-business-primary) 34%, transparent);
      }
      .lsa-brand-text { min-width: 0; display: flex; align-items: baseline; gap: 12px; }
      .lsa-title { font-size: 16px; font-weight: 700; line-height: 1.25; letter-spacing: .01em; white-space: nowrap; }
      .lsa-subtitle { font-size: 11px; color: var(--dsw-alias-label-tertiary); white-space: nowrap; }
      .lsa-top-actions { display: flex; align-items: center; gap: 5px; margin-left: auto; flex-wrap: wrap; }
      .lsa-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--dsw-alias-label-tertiary); flex: none; }
      .lsa-dot[data-state=running] { background: var(--dsw-alias-state-success-primary); }
      .lsa-dot[data-state=idle] { background: var(--dsw-alias-state-business-primary); }
      .lsa-dot[data-state=paused] { background: var(--dsw-alias-state-warn-primary); }

      /* buttons */
      .lsa-btn {
        display: inline-flex; align-items: center; justify-content: center; gap: 6px;
        height: 32px; padding: 0 13px; border-radius: 9px; border: 1px solid var(--dsw-alias-border-l3);
        background: transparent; color: var(--dsw-alias-label-primary); font-size: 12.5px; font-weight: 500;
        white-space: nowrap; transition: background .15s ease, border-color .15s ease, opacity .15s ease, transform .1s ease;
      }
      .lsa-btn:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }
      .lsa-btn:active:not(:disabled) { transform: translateY(1px); }
      .lsa-btn:disabled { opacity: .45; cursor: not-allowed; }
      .lsa-btn-sm { height: 27px; padding: 0 10px; font-size: 12px; border-radius: 8px; }
      .lsa-btn-primary {
        border-color: var(--dsw-alias-state-business-primary); background: var(--dsw-alias-state-business-primary);
        color: var(--dsw-alias-label-primary-foreground); font-weight: 600;
      }
      .lsa-btn-primary:hover:not(:disabled) { background: var(--dsw-alias-state-business-primary); opacity: .9; filter: brightness(1.04); }
      .lsa-btn-danger { border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 45%, transparent); color: var(--dsw-alias-state-error-primary); }
      .lsa-btn-danger:hover:not(:disabled) { background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent); }
      .lsa-iconbtn {
        display: inline-grid; place-items: center; width: 30px; height: 30px; padding: 0; border-radius: 9px;
        border: 1px solid transparent; background: transparent; color: var(--dsw-alias-label-secondary);
        transition: background .15s ease, color .15s ease, opacity .15s ease;
      }
      .lsa-iconbtn:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
      .lsa-iconbtn:disabled { opacity: .4; cursor: not-allowed; }
      .lsa-btn-danger.lsa-iconbtn { color: var(--dsw-alias-state-error-primary); }
      .lsa-spinner {
        display: inline-block; border-radius: 50%; flex: none;
        border: 2px solid color-mix(in srgb, currentColor 28%, transparent);
        border-top-color: currentColor; animation: lsa-spin .7s linear infinite;
      }

      /* tool strip */
      .lsa-toolstrip { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 10px 0 4px; }
      .lsa-wsfilter { display: flex; align-items: center; gap: 6px; min-width: 0; overflow-x: auto; flex: 1 1 380px; padding-bottom: 2px; scrollbar-width: none; }
      .lsa-wsfilter::-webkit-scrollbar { display: none; }
      .lsa-wschip {
        display: inline-flex; align-items: center; gap: 6px; flex: none;
        height: 30px; padding: 0 11px; border-radius: 999px; border: 1px solid var(--dsw-alias-border-l3);
        background: transparent; font-size: 12.5px; color: var(--dsw-alias-label-secondary);
        max-width: 260px; white-space: nowrap; transition: background .15s ease, border-color .15s ease, color .15s ease;
      }
      .lsa-wschip .lsa-wschip-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .lsa-wschip:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
      .lsa-wschip[aria-pressed=true] {
        border-color: color-mix(in srgb, var(--dsw-alias-state-business-primary) 55%, transparent);
        background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 10%, transparent);
        color: var(--dsw-alias-state-business-primary); font-weight: 600;
      }
      .lsa-wschip-add { border-style: dashed; color: var(--dsw-alias-label-tertiary); }
      .lsa-stats { display: flex; align-items: center; gap: 2px; flex: none; }
      .lsa-stat { display: inline-flex; align-items: baseline; gap: 5px; padding: 3px 9px; border-radius: 8px; white-space: nowrap; }
      .lsa-stat-value { font-size: 15px; font-weight: 650; line-height: 1.1; font-variant-numeric: tabular-nums; }
      .lsa-stat-label { font-size: 10.5px; color: var(--dsw-alias-label-tertiary); }
      .lsa-stat[data-tone=warn] .lsa-stat-value { color: var(--dsw-alias-state-warn-primary); }
      .lsa-stat[data-tone=business] .lsa-stat-value { color: var(--dsw-alias-state-business-primary); }
      .lsa-stat[data-tone=success] .lsa-stat-value { color: var(--dsw-alias-state-success-primary); }
      .lsa-search { position: relative; flex: 0 1 220px; min-width: 150px; }
      .lsa-search .lsa-icon { position: absolute; left: 9px; top: 50%; transform: translateY(-50%); color: var(--dsw-alias-label-tertiary); pointer-events: none; }
      .lsa-search input {
        width: 100%; height: 30px; padding: 0 30px 0 30px; border-radius: 999px;
        border: 1px solid var(--dsw-alias-border-l3); background: transparent; color: inherit; font: inherit; font-size: 12.5px;
      }
      .lsa-search input::placeholder { color: var(--dsw-alias-label-tertiary); }
      .lsa-search input:focus { border-color: var(--dsw-alias-state-business-primary); outline: none; box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsw-alias-state-business-primary) 16%, transparent); }
      .lsa-search-clear { position: absolute; right: 3px; top: 50%; transform: translateY(-50%); width: 24px; height: 24px; border: 0; border-radius: 50%; background: transparent; display: grid; place-items: center; color: var(--dsw-alias-label-tertiary); }
      .lsa-search-clear:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }

      /* banners / toasts */
      .lsa-banner {
        display: flex; align-items: center; gap: 9px; padding: 9px 12px; border-radius: 10px;
        border: 1px solid var(--dsw-alias-border-l3); font-size: 12.5px; color: var(--dsw-alias-label-secondary);
      }
      .lsa-banner > span { flex: 1 1 auto; min-width: 0; overflow-wrap: anywhere; }
      .lsa-banner-error { border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 45%, transparent); background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 7%, transparent); color: var(--dsw-alias-state-error-primary); }
      .lsa-banner-warn { border-color: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 45%, transparent); background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 7%, transparent); color: var(--dsw-alias-state-warn-primary); }
      .lsa-banner-success { border-color: color-mix(in srgb, var(--dsw-alias-state-success-primary) 45%, transparent); background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 7%, transparent); color: var(--dsw-alias-state-success-primary); }
      .lsa-banner-info { background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 6%, transparent); border-color: color-mix(in srgb, var(--dsw-alias-state-business-primary) 25%, transparent); }
      .lsa-toasts { position: fixed; right: 20px; bottom: 20px; z-index: 90; display: flex; flex-direction: column; gap: 8px; align-items: flex-end; pointer-events: none; }
      .lsa-toast {
        pointer-events: auto; display: flex; align-items: flex-start; gap: 8px; min-width: 220px; max-width: 380px;
        padding: 10px 11px; border-radius: 11px; border: 1px solid var(--dsw-alias-border-l3);
        border-left: 3px solid var(--dsw-alias-state-business-primary); background: var(--dsw-alias-bg-base);
        box-shadow: 0 8px 28px color-mix(in srgb, var(--dsw-alias-label-primary) 14%, transparent);
        animation: lsa-fade-up .18s ease both;
      }
      .lsa-toast[data-tone=success] { border-left-color: var(--dsw-alias-state-success-primary); }
      .lsa-toast[data-tone=error] { border-left-color: var(--dsw-alias-state-error-primary); }
      .lsa-toast[data-tone=warn] { border-left-color: var(--dsw-alias-state-warn-primary); }
      .lsa-toast-text { flex: 1 1 auto; min-width: 0; font-size: 12.5px; overflow-wrap: anywhere; }
      .lsa-toast .lsa-icon { margin-top: 1px; color: var(--dsw-alias-label-secondary); }

      /* generic panels */
      .lsa-panel { border: 1px solid var(--dsw-alias-border-l3); border-radius: 15px; background: var(--dsw-alias-bg-base); }
      .lsa-panel-pad { padding: 14px 16px; }
      .lsa-panel-head { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
      .lsa-panel-title { display: flex; align-items: center; gap: 7px; font-size: 13.5px; font-weight: 650; }
      .lsa-panel-title .lsa-icon { color: var(--dsw-alias-state-business-primary); }
      .lsa-panel-hint { font-size: 11.5px; color: var(--dsw-alias-label-tertiary); }
      .lsa-panel-actions { display: flex; align-items: center; gap: 8px; margin-left: auto; }

      /* form */
      .lsa-form { display: flex; flex-direction: column; gap: 12px; }
      .lsa-grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
      .lsa-grid-main { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr); gap: 10px; align-items: start; }
      .lsa-field { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
      .lsa-label-row { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
      .lsa-label { font-size: 11.5px; font-weight: 600; color: var(--dsw-alias-label-secondary); letter-spacing: .01em; }
      .lsa-label .lsa-req { color: var(--dsw-alias-state-error-primary); margin-left: 2px; }
      .lsa-counter { flex: none; font-size: 10.5px; color: var(--dsw-alias-label-tertiary); font-variant-numeric: tabular-nums; }
      .lsa-counter[data-over=true] { color: var(--dsw-alias-state-error-primary); }
      .lsa-input, .lsa-textarea, .lsa-select {
        box-sizing: border-box; width: 100%; min-width: 0; padding: 7px 10px; border-radius: 9px;
        border: 1px solid var(--dsw-alias-border-l3); background: transparent; color: inherit; font: inherit; font-size: 12.5px;
        transition: border-color .15s ease, box-shadow .15s ease;
      }
      .lsa-input { height: 33px; }
      .lsa-textarea { min-height: 66px; resize: vertical; line-height: 1.55; }
      .lsa-input::placeholder, .lsa-textarea::placeholder { color: var(--dsw-alias-label-tertiary); }
      .lsa-input:focus, .lsa-textarea:focus, .lsa-select:focus {
        border-color: var(--dsw-alias-state-business-primary); outline: none;
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsw-alias-state-business-primary) 15%, transparent);
      }
      .lsa-input[aria-invalid=true], .lsa-textarea[aria-invalid=true] { border-color: var(--dsw-alias-state-error-primary); }
      .lsa-help { font-size: 11px; color: var(--dsw-alias-label-tertiary); }
      .lsa-help-hint { display: inline-flex; align-items: center; gap: 5px; }
      .lsa-error-text { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--dsw-alias-state-error-primary); }
      .lsa-form-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      .lsa-form-actions .lsa-help { margin-left: auto; }

      /* segmented */
      .lsa-seg { display: inline-flex; padding: 2px; border-radius: 9px; border: 1px solid var(--dsw-alias-border-l3); background: transparent; gap: 2px; }
      .lsa-seg-start { align-self: flex-start; }
      .lsa-seg button {
        display: inline-flex; align-items: center; gap: 5px; height: 26px; padding: 0 10px; border: 0; border-radius: 7px;
        background: transparent; color: var(--dsw-alias-label-secondary); font-size: 12px;
      }
      .lsa-seg button:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }
      .lsa-seg button[aria-pressed=true] { background: var(--dsw-alias-state-business-primary); color: var(--dsw-alias-label-primary-foreground); font-weight: 600; }
      .lsa-seg button[aria-pressed=true] .lsa-prio-dot { background: currentColor; }
      .lsa-prio-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; opacity: .8; }
      .lsa-seg button[data-prio="3"] .lsa-prio-dot { background: var(--dsw-alias-state-warn-primary); }
      .lsa-seg button[data-prio="1"] .lsa-prio-dot { background: var(--dsw-alias-label-tertiary); }
      .lsa-seg button[aria-pressed=true][data-prio="3"] .lsa-prio-dot { background: var(--dsw-alias-label-primary-foreground); }

      /* switch */
      .lsa-switch { position: relative; flex: none; width: 34px; height: 20px; padding: 0; border-radius: 999px; border: 1px solid var(--dsw-alias-border-l3); background: color-mix(in srgb, var(--dsw-alias-label-primary) 8%, transparent); transition: background .18s ease, border-color .18s ease; }
      .lsa-switch::after { content: ""; position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; border-radius: 50%; background: var(--dsw-alias-bg-base); box-shadow: 0 1px 2px color-mix(in srgb, var(--dsw-alias-label-primary) 25%, transparent); transition: transform .18s ease; }
      .lsa-switch[aria-checked=true] { background: var(--dsw-alias-state-business-primary); border-color: var(--dsw-alias-state-business-primary); }
      .lsa-switch[aria-checked=true]::after { transform: translateX(14px); }
      .lsa-switch:disabled { opacity: .45; cursor: not-allowed; }
      .lsa-switch-row { display: flex; align-items: center; gap: 10px; }
      .lsa-switch-text { min-width: 0; flex: 1 1 auto; }
      .lsa-switch-title { font-size: 12.5px; font-weight: 600; }
      .lsa-switch-hint { font-size: 11px; color: var(--dsw-alias-label-tertiary); }

      /* model configuration */
      .lsa-model-list {
        display: flex; flex-direction: column; gap: 8px; max-height: 210px; overflow-y: auto;
        padding: 8px 9px; border: 1px solid var(--dsw-alias-border-l3); border-radius: 10px;
      }
      .lsa-model-group { display: flex; flex-direction: column; gap: 3px; }
      .lsa-model-groupname { font-size: 10.5px; font-weight: 600; color: var(--dsw-alias-label-tertiary); text-transform: uppercase; letter-spacing: .03em; }
      .lsa-model-row { display: flex; align-items: center; gap: 7px; padding: 2px 1px; font-size: 12.5px; }
      .lsa-model-checklabel { display: flex; align-items: center; gap: 7px; flex: 1 1 auto; min-width: 0; cursor: pointer; }
      .lsa-model-row:hover { color: var(--dsw-alias-label-primary); }
      .lsa-popover-sep { height: 1px; background: var(--dsw-alias-border-l3); margin: 2px 0; }
      .lsa-check { flex: none; width: 13px; height: 13px; margin: 0; accent-color: var(--dsw-alias-state-business-primary); }
      .lsa-model-name { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .lsa-tag {
        flex: none; padding: 1px 6px; border-radius: 999px; font-size: 10px;
        color: var(--dsw-alias-state-business-primary);
        border: 1px solid color-mix(in srgb, var(--dsw-alias-state-business-primary) 40%, transparent);
      }
      .lsa-model-actions { display: flex; align-items: center; gap: 8px; }
      .lsa-model-actions .lsa-help { flex: 1 1 auto; }
      .lsa-model-defaultbtn {
        flex: none; border: 0; background: transparent; padding: 1px 4px; border-radius: 6px;
        font-size: 10.5px; color: var(--dsw-alias-state-business-primary);
      }
      .lsa-model-defaultbtn:hover { background: var(--dsw-alias-interactive-bg-hover); }

      /* Inline decisions: one calm surface, directly answerable, bounded at scale. */
      .lsa-needs { border: 1px solid var(--dsw-alias-border-l3); border-left: 3px solid var(--dsw-alias-state-business-primary); border-radius: 11px; padding: 9px 12px; background: var(--dsw-alias-bg-base); }
      .lsa-needs-head { display: flex; align-items: center; gap: 7px; min-height: 26px; }
      .lsa-needs-head > button { margin-left: auto; }
      .lsa-needs-icon { color: var(--dsw-alias-state-business-primary); }
      .lsa-needs-title { font-size: 12px; font-weight: 650; }
      .lsa-needs-count { font-size: 11px; font-weight: 600; color: var(--dsw-alias-label-tertiary); font-variant-numeric: tabular-nums; }
      .lsa-needs-list { display: flex; flex-direction: column; max-height: 340px; overflow-y: auto; overscroll-behavior: contain; scrollbar-gutter: stable; margin-top: 5px; }
      .lsa-needs-card { display: flex; flex-direction: column; gap: 6px; min-width: 0; flex: none; padding: 6px 3px 5px 0; }
      .lsa-needs-card + .lsa-needs-card { border-top: 1px solid var(--dsw-alias-border-l3); margin-top: 8px; padding-top: 10px; }
      .lsa-needs-card-head { display: flex; align-items: baseline; gap: 8px; }
      .lsa-needs-card-head > button { flex: none; height: 23px; border-color: transparent; color: var(--dsw-alias-label-secondary); }
      .lsa-needs-card-title { flex: 1 1 auto; min-width: 0; font-size: 12px; font-weight: 650; overflow-wrap: anywhere; }
      .lsa-needs-card-meta { min-width: 0; max-width: 30%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; color: var(--dsw-alias-label-tertiary); }
      .lsa-attention-question { font-size: 12.5px; line-height: 1.5; white-space: pre-wrap; overflow-wrap: anywhere; }
      .lsa-needs .lsa-textarea { min-height: 48px; padding: 6px 9px; }
      .lsa-attention-timer { overflow-wrap: anywhere; }
      .lsa-needs .lsa-answer-actions .lsa-help { margin-left: 0; }
      .lsa-question { display: flex; gap: 7px; align-items: flex-start; padding: 8px 10px; border-radius: 9px; background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 8%, transparent); }
      .lsa-question .lsa-icon { margin-top: 1px; color: var(--dsw-alias-state-business-primary); }
      .lsa-question-text { min-width: 0; font-size: 12.5px; line-height: 1.5; white-space: pre-wrap; overflow-wrap: anywhere; }
      .lsa-answer-row { display: flex; flex-direction: column; gap: 6px; }
      .lsa-answer-row .lsa-textarea { min-height: 54px; }
      .lsa-answer-actions { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
      .lsa-answer-actions .lsa-help { margin-left: auto; }
      .lsa-needs-actions { display: flex; align-items: center; gap: 4px; }

      /* board */
      .lsa-layout { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; align-items: start; padding-top: 10px; }
      .lsa-layout[data-detail=true] { grid-template-columns: minmax(0, 1fr) 398px; }
      .lsa-main-col { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
      .lsa-board { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; align-items: start; }
      .lsa-col {
        display: flex; flex-direction: column; gap: 8px; min-width: 0; padding: 8px;
        border-radius: 11px; border: 1px solid var(--dsw-alias-border-l3);
        background: color-mix(in srgb, var(--dsw-alias-label-primary) 2%, var(--dsw-alias-bg-base));
      }
      .lsa-col-head { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; padding: 2px 3px 1px; }
      .lsa-col-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--dsw-alias-label-tertiary); }
      .lsa-col[data-tone=queued] .lsa-col-dot { background: var(--dsw-alias-label-tertiary); }
      .lsa-col[data-tone=running] .lsa-col-dot { background: var(--dsw-alias-state-warn-primary); }
      .lsa-col[data-tone=ended] .lsa-col-dot { background: var(--dsw-alias-state-success-primary); }
      .lsa-col-title { font-size: 12.5px; font-weight: 650; letter-spacing: .01em; }
      .lsa-count { display: inline-flex; align-items: center; justify-content: center; min-width: 19px; height: 18px; padding: 0 6px; border-radius: 999px; background: color-mix(in srgb, var(--dsw-alias-label-primary) 7%, transparent); color: var(--dsw-alias-label-secondary); font-size: 10.5px; font-weight: 600; font-variant-numeric: tabular-nums; }
      .lsa-col-head .lsa-filter { margin-left: auto; }
      .lsa-filter { display: inline-flex; gap: 3px; }
      .lsa-filter button { height: 21px; padding: 0 7px; border: 1px solid transparent; border-radius: 999px; background: transparent; color: var(--dsw-alias-label-tertiary); font-size: 10.5px; }
      .lsa-filter button:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
      .lsa-filter button[aria-pressed=true] { border-color: var(--dsw-alias-border-l3); background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); font-weight: 600; }
      .lsa-col-list { display: flex; flex-direction: column; gap: 7px; min-width: 0; }
      .lsa-col-empty { min-height: 40px; display: flex; align-items: center; justify-content: center; font-size: 11px; color: var(--dsw-alias-label-tertiary); text-align: center; padding: 8px; }

      /* task card */
      .lsa-card {
        position: relative; display: flex; flex-direction: column; gap: 5px; width: 100%; padding: 10px 11px 10px 13px;
        border-radius: 11px; border: 1px solid var(--dsw-alias-border-l3); background: var(--dsw-alias-bg-base);
        text-align: left; cursor: pointer; overflow: hidden;
        transition: border-color .15s ease, transform .12s ease, box-shadow .15s ease;
      }
      .lsa-card::before { content: ""; position: absolute; left: 0; top: 9px; bottom: 9px; width: 3px; border-radius: 0 3px 3px 0; background: var(--dsw-alias-border-l3); }
      .lsa-card[data-status=running]::before, .lsa-card[data-status=reviewing]::before { background: var(--dsw-alias-state-warn-primary); }
      .lsa-card[data-status=needs_you]::before { background: var(--dsw-alias-state-business-primary); }
      .lsa-card[data-status=done]::before { background: var(--dsw-alias-state-success-primary); }
      .lsa-card[data-status=failed]::before { background: var(--dsw-alias-state-error-primary); }
      .lsa-card[data-status=cancelled]::before { background: var(--dsw-alias-label-tertiary); }
      .lsa-card:hover { border-color: color-mix(in srgb, var(--dsw-alias-state-business-primary) 42%, var(--dsw-alias-border-l3)); transform: translateY(-1px); box-shadow: 0 5px 16px color-mix(in srgb, var(--dsw-alias-label-primary) 8%, transparent); }
      .lsa-card:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: 1px; }
      .lsa-card-head { display: flex; align-items: flex-start; gap: 7px; }
      .lsa-card-title { flex: 1 1 auto; min-width: 0; display: -webkit-box; overflow: hidden; -webkit-line-clamp: 2; -webkit-box-orient: vertical; font-size: 12.5px; font-weight: 600; line-height: 1.42; overflow-wrap: anywhere; }
      .lsa-card-chevron { flex: none; margin-top: 1px; color: var(--dsw-alias-label-tertiary); opacity: 0; transition: opacity .15s ease, transform .15s ease; }
      .lsa-card:hover .lsa-card-chevron { opacity: 1; transform: translateX(1px); }
      .lsa-prio { flex: none; display: inline-flex; align-items: center; gap: 4px; font-size: 10px; color: var(--dsw-alias-label-tertiary); }
      .lsa-prio i { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
      .lsa-prio[data-priority="3"] { color: var(--dsw-alias-state-warn-primary); }
      .lsa-card-meta { display: flex; align-items: center; gap: 4px 8px; flex-wrap: wrap; font-size: 10.5px; color: var(--dsw-alias-label-tertiary); }
      .lsa-card-meta .lsa-icon { display: inline-block; vertical-align: -1px; margin-right: 2px; }
      .lsa-card-progress { display: flex; align-items: flex-start; gap: 5px; font-size: 11.5px; line-height: 1.45; color: var(--dsw-alias-label-secondary); }
      .lsa-card-progress .lsa-icon { margin-top: 1px; color: var(--dsw-alias-label-tertiary); }
      .lsa-card-progress-text { display: -webkit-box; overflow: hidden; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow-wrap: anywhere; }
      .lsa-card-question { display: flex; gap: 6px; align-items: flex-start; margin-top: 1px; padding: 6px 8px; border-radius: 8px; background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 8%, transparent); }
      .lsa-card-question .lsa-icon { margin-top: 1px; color: var(--dsw-alias-state-business-primary); }
      .lsa-card-question-text { font-size: 11.5px; line-height: 1.45; color: var(--dsw-alias-label-primary); display: -webkit-box; overflow: hidden; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow-wrap: anywhere; }
      .lsa-card-note { display: flex; gap: 6px; align-items: flex-start; font-size: 11.5px; line-height: 1.45; color: var(--dsw-alias-label-secondary); }
      .lsa-card-note .lsa-icon { margin-top: 1px; flex: none; }
      .lsa-card-note[data-tone=success] .lsa-icon { color: var(--dsw-alias-state-success-primary); }
      .lsa-card-note[data-tone=error] .lsa-icon { color: var(--dsw-alias-state-error-primary); }
      .lsa-card-note[data-tone=warn] .lsa-icon { color: var(--dsw-alias-state-warn-primary); }

      /* empty + loading */
      .lsa-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 44px 20px; text-align: center; border: 1px dashed color-mix(in srgb, var(--dsw-alias-label-primary) 15%, transparent); border-radius: 16px; }
      .lsa-empty-art { color: color-mix(in srgb, var(--dsw-alias-state-business-primary) 62%, var(--dsw-alias-label-tertiary)); margin-bottom: 2px; }
      .lsa-empty-title { font-size: 14px; font-weight: 650; }
      .lsa-empty-hint { max-width: 420px; font-size: 12px; color: var(--dsw-alias-label-secondary); }
      .lsa-empty .lsa-btn { margin-top: 4px; }
      .lsa-loading { display: flex; flex-direction: column; gap: 14px; padding-top: 18px; }
      .lsa-skeleton-cols { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
      .lsa-skeleton-card { display: flex; flex-direction: column; gap: 8px; padding: 12px; border: 1px solid var(--dsw-alias-border-l3); border-radius: 13px; }
      .lsa-skeleton-line { display: block; height: 9px; border-radius: 999px; background: color-mix(in srgb, var(--dsw-alias-label-primary) 9%, transparent); animation: lsa-pulse 1.5s ease-in-out infinite; }
      .lsa-skeleton-line-lg { width: 72%; height: 12px; }
      .lsa-skeleton-line-sm { width: 44%; }

      /* detail drawer */
      .lsa-scrim { display: none; position: fixed; inset: 0; z-index: 55; background: color-mix(in srgb, var(--dsw-alias-label-primary) 30%, transparent); backdrop-filter: blur(2px); animation: lsa-fade .16s ease both; }
      .lsa-drawer {
        position: sticky; top: 76px; display: flex; flex-direction: column; overflow: hidden;
        max-height: calc(100vh - 100px); border-radius: 16px; border: 1px solid var(--dsw-alias-border-l3);
        background: var(--dsw-alias-bg-base); box-shadow: 0 12px 36px color-mix(in srgb, var(--dsw-alias-label-primary) 10%, transparent);
        animation: lsa-fade-up .16s ease both;
      }
      .lsa-drawer-head { display: flex; align-items: flex-start; gap: 9px; padding: 13px 14px 11px; border-bottom: 1px solid var(--dsw-alias-border-l3); }
      .lsa-drawer-titles { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
      .lsa-drawer-title { font-size: 14px; font-weight: 700; line-height: 1.4; overflow-wrap: anywhere; }
      .lsa-drawer-sub { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; font-size: 11px; color: var(--dsw-alias-label-tertiary); }
      .lsa-drawer-body { display: flex; flex-direction: column; gap: 16px; padding: 14px; overflow: auto; min-height: 0; }
      .lsa-drawer-foot { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; padding: 10px 14px; border-top: 1px solid var(--dsw-alias-border-l3); background: color-mix(in srgb, var(--dsw-alias-label-primary) 2%, var(--dsw-alias-bg-base)); }
      .lsa-drawer-foot .lsa-spacer { flex: 1 1 auto; }
      .lsa-sec { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
      .lsa-sec-title { display: flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 650; letter-spacing: .07em; text-transform: uppercase; color: var(--dsw-alias-label-tertiary); }
      .lsa-sec-title .lsa-icon { color: var(--dsw-alias-label-tertiary); }
      .lsa-sec-body { min-width: 0; }
      .lsa-kv { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 12px; }
      .lsa-kv-item { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
      .lsa-kv-term { font-size: 10.5px; color: var(--dsw-alias-label-tertiary); }
      .lsa-kv-value { font-size: 12px; overflow-wrap: anywhere; }
      .lsa-text { white-space: pre-wrap; overflow-wrap: anywhere; font-size: 12.5px; line-height: 1.6; }
      .lsa-report { display: flex; flex-direction: column; gap: 7px; padding: 10px 11px; border-radius: 11px; border: 1px solid var(--dsw-alias-border-l3); background: color-mix(in srgb, var(--dsw-alias-label-primary) 2.4%, var(--dsw-alias-bg-base)); }
      .lsa-report-head { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
      .lsa-chip { display: inline-flex; align-items: center; align-self: flex-start; flex: none; gap: 4px; height: 18px; padding: 0 6px; border-radius: 999px; border: 1px solid var(--dsw-alias-border-l3); background: transparent; font-size: 10.5px; font-weight: 600; color: var(--dsw-alias-label-secondary); white-space: nowrap; }
      .lsa-chip[data-tone=success] { border-color: color-mix(in srgb, var(--dsw-alias-state-success-primary) 50%, transparent); color: var(--dsw-alias-state-success-primary); }
      .lsa-chip[data-tone=business] { border-color: color-mix(in srgb, var(--dsw-alias-state-business-primary) 50%, transparent); color: var(--dsw-alias-state-business-primary); }
      .lsa-chip[data-tone=warn] { border-color: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 50%, transparent); color: var(--dsw-alias-state-warn-primary); }
      .lsa-chip[data-tone=error] { border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 50%, transparent); color: var(--dsw-alias-state-error-primary); }
      .lsa-chip-muted { color: var(--dsw-alias-label-tertiary); }
      .lsa-deliv { display: flex; flex-wrap: wrap; gap: 5px; }
      .lsa-deliv code { padding: 1px 7px; border-radius: 6px; background: color-mix(in srgb, var(--dsw-alias-label-primary) 6%, transparent); font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 10.5px; overflow-wrap: anywhere; }
      .lsa-copy-row { display: flex; align-items: center; gap: 6px; }
      .lsa-copy-row .lsa-input { flex: 1 1 auto; height: 30px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 11px; }
      .lsa-timeline { display: flex; flex-direction: column; gap: 0; margin: 0; padding: 0; list-style: none; }
      .lsa-tl { position: relative; display: grid; grid-template-columns: 15px minmax(0, 1fr); gap: 8px; padding-bottom: 10px; }
      .lsa-tl:last-child { padding-bottom: 0; }
      .lsa-tl::before { content: ""; position: absolute; left: 6px; top: 14px; bottom: 0; width: 1px; background: var(--dsw-alias-border-l3); }
      .lsa-tl:last-child::before { display: none; }
      .lsa-tl-dot { position: relative; z-index: 1; width: 13px; height: 13px; margin-top: 1px; border-radius: 50%; border: 2px solid var(--dsw-alias-border-l3); background: var(--dsw-alias-bg-base); }
      .lsa-tl[data-kind=create] .lsa-tl-dot, .lsa-tl[data-kind=dispatch] .lsa-tl-dot { border-color: var(--dsw-alias-state-business-primary); }
      .lsa-tl[data-kind=report] .lsa-tl-dot { border-color: var(--dsw-alias-state-success-primary); }
      .lsa-tl[data-kind=review] .lsa-tl-dot { border-color: var(--dsw-alias-state-warn-primary); }
      .lsa-tl[data-kind=answer] .lsa-tl-dot { border-color: var(--dsw-alias-state-business-primary); background: var(--dsw-alias-state-business-primary); }
      .lsa-tl[data-kind=error] .lsa-tl-dot, .lsa-tl[data-kind=timeout] .lsa-tl-dot { border-color: var(--dsw-alias-state-error-primary); }
      .lsa-tl[data-kind=stop] .lsa-tl-dot, .lsa-tl[data-kind=cancelled] .lsa-tl-dot { border-color: var(--dsw-alias-label-tertiary); }
      .lsa-tl-body { min-width: 0; display: flex; flex-direction: column; gap: 1px; }
      .lsa-tl-head { display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap; font-size: 10.5px; color: var(--dsw-alias-label-tertiary); }
      .lsa-tl-kind { padding: 0 5px; border-radius: 999px; border: 1px solid var(--dsw-alias-border-l3); font-size: 9.5px; text-transform: uppercase; letter-spacing: .03em; }
      .lsa-tl-text { font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; white-space: pre-wrap; }
      .lsa-confirm { display: flex; flex-direction: column; gap: 8px; padding: 11px 12px; border-radius: 11px; border: 1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary) 45%, transparent); background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 6%, transparent); }
      .lsa-confirm-actions { display: flex; gap: 7px; }

      /* popovers */
      .lsa-popwrap { position: relative; }
      .lsa-popover {
        position: absolute; right: 0; top: calc(100% + 8px); z-index: 60; width: 330px; max-width: min(330px, 90vw);
        padding: 14px; border-radius: 15px; border: 1px solid var(--dsw-alias-border-l3);
        max-height: calc(100dvh - 120px); overflow-y: auto; overscroll-behavior: contain;
        background: var(--dsw-alias-bg-base); box-shadow: 0 16px 44px color-mix(in srgb, var(--dsw-alias-label-primary) 16%, transparent);
        display: flex; flex-direction: column; gap: 12px; animation: lsa-fade-up .15s ease both;
      }
      .lsa-popover-wide { width: 392px; max-width: min(392px, 92vw); }
      .lsa-popover-head { display: flex; align-items: center; gap: 8px; }
      .lsa-popover-title { flex: 1 1 auto; font-size: 13px; font-weight: 650; }
      .lsa-meta-list { display: flex; flex-direction: column; gap: 5px; padding-top: 10px; border-top: 1px solid var(--dsw-alias-border-l3); }
      .lsa-meta-line { display: flex; align-items: baseline; gap: 8px; font-size: 11px; color: var(--dsw-alias-label-tertiary); }
      .lsa-meta-line-value { min-width: 0; overflow-wrap: anywhere; color: var(--dsw-alias-label-secondary); font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 10.5px; }
      .lsa-inline-error { display: flex; align-items: flex-start; gap: 6px; padding: 7px 9px; border-radius: 8px; background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 8%, transparent); color: var(--dsw-alias-state-error-primary); font-size: 11.5px; }

      /* dialog */
      .lsa-scrim-center { display: flex; align-items: center; justify-content: center; position: fixed; inset: 0; z-index: 75; padding: 20px; background: color-mix(in srgb, var(--dsw-alias-label-primary) 34%, transparent); backdrop-filter: blur(3px); animation: lsa-fade .15s ease both; }
      .lsa-dialog { display: flex; flex-direction: column; gap: 10px; width: min(430px, 94vw); padding: 18px; border-radius: 16px; border: 1px solid var(--dsw-alias-border-l3); background: var(--dsw-alias-bg-base); box-shadow: 0 24px 60px color-mix(in srgb, var(--dsw-alias-label-primary) 24%, transparent); animation: lsa-fade-up .16s ease both; }
      .lsa-dialog-title { font-size: 14px; font-weight: 700; }
      .lsa-dialog-hint { font-size: 12px; line-height: 1.55; color: var(--dsw-alias-label-secondary); }
      .lsa-dialog-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }

      /* motion */
      @keyframes lsa-spin { to { transform: rotate(360deg); } }
      @keyframes lsa-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }
      @keyframes lsa-fade { from { opacity: 0; } to { opacity: 1; } }
      @keyframes lsa-fade-up { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      @media (prefers-reduced-motion: reduce) {
        .lsa-page *, .lsa-page *::before, .lsa-page *::after { animation-duration: .001ms !important; transition-duration: .001ms !important; }
      }

      /* responsive */
      @container lsaboard (max-width: 1180px) {
        .lsa-layout[data-detail=true] { grid-template-columns: minmax(0, 1fr); }
        .lsa-drawer { position: fixed; top: 0; right: 0; bottom: 0; width: min(430px, 94vw); max-height: none; border-radius: 0; z-index: 60; }
        .lsa-scrim { display: block; }
      }
      @container lsaboard (max-width: 900px) {
        .lsa-board { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .lsa-skeleton-cols { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .lsa-grid-main, .lsa-grid-2 { grid-template-columns: minmax(0, 1fr); }
        .lsa-subtitle { display: none; }
      }
      /* Supervisor navigation is a single horizontal rail, not another board. */
      .lsa-agent-section { padding: 5px 0 8px; border-bottom: 1px solid var(--dsw-alias-border-l3); min-width: 0; }
      .lsa-agent-nav { position: relative; display: flex; align-items: center; gap: 8px; min-width: 0; }
      .lsa-agent-label { flex: none; font-size: 11px; font-weight: 600; color: var(--dsw-alias-label-tertiary); }
      .lsa-agent-rail { display: flex; align-items: center; gap: 4px; flex: 0 1 auto; min-width: 0; overflow-x: auto; padding: 3px; scrollbar-width: thin; }
      .lsa-agent-tab { display: inline-flex; align-items: center; gap: 6px; flex: none; max-width: 280px; min-height: 29px; padding: 3px 10px; border: 1px solid transparent; border-radius: 7px; background: transparent; color: var(--dsw-alias-label-secondary); font-size: 12px; }
      .lsa-agent-tab:hover { background: var(--dsw-alias-interactive-bg-hover); }
      .lsa-agent-tab[aria-pressed=true] { border-color: var(--dsw-alias-border-l3); background: color-mix(in srgb, var(--dsw-alias-label-primary) 5%, var(--dsw-alias-bg-base)); color: var(--dsw-alias-label-primary); font-weight: 600; }
      .lsa-agent-name, .lsa-agent-scope { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .lsa-agent-scope { max-width: 100px; font-size: 10px; color: var(--dsw-alias-label-tertiary); font-weight: 400; }
      .lsa-agent-summary { display: flex; align-items: center; gap: 5px 14px; flex-wrap: wrap; padding: 4px 2px 0; font-size: 11px; color: var(--dsw-alias-label-tertiary); }
      .lsa-agent-summary > span { display: inline-flex; align-items: center; gap: 5px; max-width: 280px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .lsa-agent-option { display: inline-flex; align-items: center; flex: none; gap: 1px; }
      .lsa-agent-create, .lsa-agent-more { flex: none; }
      .lsa-agent-more { font-size: 22px; line-height: 1; }
      .lsa-agent-popup { position: absolute; right: 0; top: calc(100% + 6px); z-index: 45; width: min(330px, 100%); max-height: min(440px, 70dvh); overflow-y: auto; padding: 12px; border-radius: 11px; border: 1px solid var(--dsw-alias-border-l3); background: var(--dsw-alias-bg-base); box-shadow: 0 10px 28px color-mix(in srgb, var(--dsw-alias-label-primary) 14%, transparent); }
      .lsa-agent-popup-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; overflow-wrap: anywhere; }
      .lsa-agent-menu, .lsa-agent-confirm { display: flex; flex-direction: column; gap: 8px; padding-top: 10px; }
      .lsa-agent-menu > button { justify-content: flex-start; }
      .lsa-agent-editor { margin-top: 8px; padding: 10px; border: 1px solid var(--dsw-alias-border-l3); border-radius: 9px; }
      .lsa-task-entry { display: flex; flex-direction: column; align-items: flex-start; gap: 9px; margin: 10px 0 0; }
      .lsa-task-entry > .lsa-panel { align-self: stretch; }
      .lsa-agent-form { margin-top: 8px; display: flex; flex-wrap: wrap; align-items: end; gap: 8px; }
      .lsa-agent-form .lsa-field { flex: 1 1 180px; }
      .lsa-scope-label { margin: 5px 0; font-size: 11px; color: var(--dsw-alias-label-secondary); overflow-wrap: anywhere; }
      .lsa-card[data-status=needs_you] { border-color: color-mix(in srgb, var(--dsw-alias-state-business-primary) 35%, var(--dsw-alias-border-l3)); }
      .lsa-waiting { display: flex; align-items: baseline; gap: 8px; font-size: 11px; color: var(--dsw-alias-label-secondary); }
      .lsa-waiting .lsa-card-question-text { flex: 1; min-width: 0; -webkit-line-clamp: 1; }
      .lsa-card-detail-link { flex: none; font-size: 10.5px; color: var(--dsw-alias-state-business-primary); }
      .lsa-card-model { max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .lsa-select option, .lsa-select optgroup { background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); }
      @media (prefers-reduced-motion: reduce) { .lsa-page *, .lsa-page *::before, .lsa-page *::after { animation: none !important; transition: none !important; } }
      @container lsaboard (max-width: 620px) {
        .lsa-board { grid-template-columns: minmax(0, 1fr); }
        .lsa-skeleton-cols { grid-template-columns: minmax(0, 1fr); }
        .lsa-shell { padding: 0 13px 44px; }
        .lsa-topbar { margin: 0 -13px; padding: 11px 13px; }
        .lsa-agent-label { display: none; }
        .lsa-agent-nav { gap: 5px; }
        .lsa-agent-summary { gap: 4px 10px; }
        .lsa-btn { padding: 0 10px; }
      }
    `

    /* --------------------------------------------------------------------- */
    /* helpers                                                               */
    /* --------------------------------------------------------------------- */

    const STATUS_KEYS = {
      queued: 'statusQueued',
      running: 'statusRunning',
      reviewing: 'statusReviewing',
      needs_you: 'statusNeedsYou',
      done: 'statusDone',
      failed: 'statusFailed',
      cancelled: 'statusCancelled',
    }
    const PRIORITY_KEYS = { 1: 'priorityLow', 2: 'priorityNormal', 3: 'priorityHigh' }
    const REPORT_KEYS = {
      ready: 'stateReady',
      needs_decision: 'stateNeedsDecision',
      blocked: 'stateBlocked',
      failed: 'stateFailed',
    }
    const VERDICT_KEYS = {
      done: 'verdictDone',
      continue: 'verdictContinue',
      needs_you: 'verdictNeedsYou',
      fail: 'verdictFail',
    }
    const ENDED_FILTERS = ['all', 'done', 'failed', 'cancelled']
    const ENDED_FILTER_KEYS = {
      all: 'filterAll',
      done: 'statusDone',
      failed: 'statusFailed',
      cancelled: 'statusCancelled',
    }

    let uidCounter = 0

    function useUid(prefix) {
      const ref = React.useRef(null)
      if (ref.current === null) {
        uidCounter += 1
        ref.current = prefix + '-' + uidCounter
      }
      return ref.current
    }

    function fill(template, values) {
      return String(template).replace(/\{(\w+)\}/g, (match, key) => {
        if (!values || !Object.prototype.hasOwnProperty.call(values, key)) return match
        return String(values[key])
      })
    }

    function asNumber(value) {
      return typeof value === 'number' && Number.isFinite(value) ? value : 0
    }

    function pad2(value) {
      return value < 10 ? '0' + value : String(value)
    }

    function formatDuration(ms) {
      if (typeof ms !== 'number' || !Number.isFinite(ms) || ms < 0) return '—'
      const total = Math.floor(ms / 1000)
      const seconds = total % 60
      const minutes = Math.floor(total / 60) % 60
      const hours = Math.floor(total / 3600)
      return hours > 0 ? hours + ':' + pad2(minutes) + ':' + pad2(seconds) : minutes + ':' + pad2(seconds)
    }

    const dateFormatter = new Intl.DateTimeFormat(undefined, {
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    })

    function formatTime(value) {
      if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
      try {
        return dateFormatter.format(new Date(value))
      } catch (error) {
        return '—'
      }
    }

    function latestProgress(task) {
      const list = Array.isArray(task.progress) ? task.progress : []
      return list.length > 0 ? list[list.length - 1] : null
    }

    function elapsedFor(task, now) {
      const start = typeof task.startedAt === 'number'
        ? task.startedAt
        : typeof task.createdAt === 'number' ? task.createdAt : 0
      if (typeof task.durationMs === 'number' && Number.isFinite(task.durationMs)) return Math.max(0, task.durationMs)
      if (typeof task.finishedAt === 'number' && start) return Math.max(0, task.finishedAt - start)
      if (start) return Math.max(0, now - start)
      return 0
    }

    function elapsedKey(status) {
      if (status === 'queued') return 'waitingFor'
      if (status === 'running' || status === 'reviewing') return 'runningFor'
      return 'took'
    }

    function statusLabel(t, status) {
      return t(STATUS_KEYS[status] || 'statusQueued')
    }

    function isAbsolutePath(value) {
      if (typeof value !== 'string' || value.length === 0) return false
      return /^[A-Za-z]:[\\/]/.test(value) || /^\\\\[^\\]/.test(value) || value.charAt(0) === '/'
    }

    /* --------------------------------------------------------------------- */
    /* data layer                                                            */
    /* --------------------------------------------------------------------- */

    function hostError(code, message) {
      const error = new Error(message || code)
      error.code = code
      return error
    }

    function errorInfo(error) {
      return {
        code: error && typeof error.code === 'string' ? error.code : 'internal',
        message: error && typeof error.message === 'string' ? error.message : '',
      }
    }

    function errorText(t, info) {
      if (!info) return ''
      switch (info.code) {
        case 'offline': return t('errorOffline')
        case 'transport': return t('errorTransport')
        case 'forbidden': return t('errorForbidden')
        case 'invalid_request': return info.message || t('errorInvalid')
        case 'unknown_action': return t('errorUnknownAction')
        case 'settings_scope_changed': return t('globalSettingsReload')
        default: return info.message || t('errorInternal')
      }
    }

    function normalizeModelSelection(value) {
      if (!value || typeof value !== 'object') return null
      const provider = typeof value.provider === 'string' ? value.provider.trim() : ''
      const model = typeof value.model === 'string' ? value.model.trim() : ''
      if (!provider || !model) return null
      const reasoningEffort = typeof value.reasoningEffort === 'string' ? value.reasoningEffort.trim() : ''
      return { provider, model, ...(reasoningEffort ? { reasoningEffort } : {}) }
    }

    function normalizeModels(value) {
      const source = value && typeof value === 'object' ? value : {}
      const seen = new Set()
      const workers = []
      for (const item of Array.isArray(source.workers) ? source.workers : []) {
        const selection = normalizeModelSelection(item)
        if (!selection) continue
        const key = modelKey(selection)
        if (seen.has(key)) continue
        seen.add(key)
        workers.push(selection)
        if (workers.length >= 8) break
      }
      return { supervisor: normalizeModelSelection(source.supervisor), workers }
    }

    function modelKey(selection) {
      return selection ? selection.provider + '/' + selection.model : ''
    }

    function shortModelLabel(selection) {
      const name = selection?.model?.split('/').pop() || ''
      return name.length > 28 ? name.slice(0, 25) + '…' : name
    }

    function normalizeModelCatalog(value) {
      const source = value && typeof value === 'object' ? value : {}
      const groups = []
      for (const group of Array.isArray(source.groups) ? source.groups : []) {
        if (!group || typeof group.id !== 'string' || !group.id) continue
        const models = []
        for (const model of Array.isArray(group.models) ? group.models : []) {
          if (!model || typeof model.id !== 'string' || !model.id) continue
          models.push({ id: model.id, name: typeof model.name === 'string' && model.name ? model.name : model.id })
        }
        if (models.length > 0) {
          groups.push({
            id: group.id,
            name: typeof group.name === 'string' && group.name ? group.name : group.id,
            models,
          })
        }
      }
      return {
        available: groups.length > 0,
        groups,
        models: normalizeModels(source.models),
        reason: typeof source.reason === 'string' ? source.reason : '',
      }
    }

    function normalizeSettings(value) {
      const raw = value && typeof value === 'object' ? value : {}
      const minutes = Number(raw.autonomy?.waitMinutes)
      return {
        paused: raw.paused === true,
        maxWorkers: Math.min(4, Math.max(1, Math.round(Number(raw.maxWorkers) || 2))),
        autoReview: raw.autoReview !== false,
        models: normalizeModels(raw.models),
        autonomy: { enabled: raw.autonomy?.enabled === true, waitMinutes: Number.isFinite(minutes) ? Math.min(1440, Math.max(1, Math.round(minutes))) : 30 },
      }
    }

    function ownerTitle(task, superagents, t) {
      const owner = superagents.find(agent => agent.id === task.superagentId)
      return owner ? owner.title : task.superagentTitle || (task.superagentId ? t('historicalSuperagent') + ' · ' + task.superagentId : t('legacySuperagent'))
    }

    function questionKey(task) {
      return JSON.stringify([task.question?.at ?? null, task.question?.text || ''])
    }

    function waitingText(task, settings, now, t) {
      if (task.autonomyReviewPending === true) return t('autonomyDue')
      if (settings?.paused) return t('pausedHint')
      if (task.autonomy?.attempted) return t('autonomyAttempted')
      if (task.question?.requiresHuman !== false || !settings?.autonomy?.enabled || !Number.isFinite(task.question?.at)) return t('humanWaiting')
      const remaining = task.question.at + settings.autonomy.waitMinutes * 60000 - now
      return remaining > 0 ? fill(t('autonomyCountdown'), { time: formatDuration(remaining) }) : t('autonomyDue')
    }

    function scopeTasks(tasks, workspaceId, superagentId) {
      return tasks.filter(task => (!workspaceId || task.workspaceId === workspaceId) && (!superagentId || task.superagentId === superagentId))
    }

    function normalizeBoard(value) {
      const source = value && typeof value === 'object' ? value : {}
      const workspaces = Array.isArray(source.workspaces)
        ? source.workspaces.filter(item => item && typeof item === 'object')
        : []
      const tasks = Array.isArray(source.tasks)
        ? source.tasks.filter(item => item && typeof item === 'object').map(item => ({
          ...item,
          workerModel: normalizeModelSelection(item.workerModel),
        }))
        : []
      const settings = normalizeSettings(source.settings)
      const maxWorkers = settings.maxWorkers
      const multiSuperagent = Array.isArray(source.superagents)
      const superagents = (multiSuperagent ? source.superagents : [])
        .filter(item => item && typeof item.id === 'string' && typeof item.workspaceId === 'string')
        .map(item => ({ ...item, title: item.title || item.id, settings: source.settingsScope === 'global' ? settings : normalizeSettings(item.settings) }))
      const count = status => tasks.filter(task => task.status === status).length
      const rawLive = source.live && typeof source.live === 'object' ? source.live : {}
      const live = {
        running: Number.isFinite(rawLive.running) ? rawLive.running : count('running'),
        queued: Number.isFinite(rawLive.queued) ? rawLive.queued : count('queued'),
        reviewing: Number.isFinite(rawLive.reviewing) ? rawLive.reviewing : count('reviewing'),
        needsYou: Number.isFinite(rawLive.needsYou) ? rawLive.needsYou : count('needs_you'),
        done: Number.isFinite(rawLive.done) ? rawLive.done : count('done'),
        failed: Number.isFinite(rawLive.failed) ? rawLive.failed : count('failed'),
        capacity: Number.isFinite(rawLive.capacity) ? rawLive.capacity : maxWorkers,
        attention: Number.isFinite(rawLive.attention) ? rawLive.attention : count('needs_you'),
      }
      return {
        version: typeof source.version === 'string' ? source.version : '',
        stateDir: typeof source.stateDir === 'string' ? source.stateDir : '',
        settings,
        settingsScope: source.settingsScope === 'global' ? 'global' : '',
        superagents,
        multiSuperagent,
        workspaces,
        tasks,
        live,
        supervisor: source.supervisor && typeof source.supervisor === 'object' ? source.supervisor : null,
      }
    }

    async function invoke(action, payload) {
      let response
      try {
        response = await fetch(ROUTE, {
          method: 'POST',
          credentials: 'same-origin',
          redirect: 'error',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action, ...(payload || {}) }),
          signal: typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
            ? AbortSignal.timeout(15000)
            : undefined,
        })
      } catch (cause) {
        throw hostError('offline', cause && cause.message ? cause.message : '')
      }
      if (!response) throw hostError('transport', 'no response')
      if (!response.ok) {
        // A refused request still carries the Host's JSON reason (e.g. 403 forbidden).
        let failure = null
        try {
          failure = await response.json()
        } catch (cause) {
          failure = null
        }
        if (failure && typeof failure.code === 'string') {
          throw hostError(failure.code, typeof failure.message === 'string' ? failure.message : '')
        }
        throw hostError('transport', 'HTTP ' + response.status)
      }
      let value
      try {
        value = await response.json()
      } catch (cause) {
        throw hostError('transport', 'invalid JSON')
      }
      if (!value || value.ok !== true) {
        throw hostError(
          value && typeof value.code === 'string' ? value.code : 'internal',
          value && typeof value.message === 'string' ? value.message : '',
        )
      }
      return value.data
    }


    /* --------------------------------------------------------------------- */
    /* presentational pieces                                                 */
    /* --------------------------------------------------------------------- */

    const STATUS_TONE = {
      queued: 'muted', running: 'warn', reviewing: 'warn', needs_you: 'business',
      done: 'success', failed: 'error', cancelled: 'muted',
    }
    const REPORT_TONE = { ready: 'success', needs_decision: 'business', blocked: 'warn', failed: 'error' }
    const VERDICT_TONE = { done: 'success', continue: 'business', needs_you: 'business', fail: 'error' }

    function StatusChip({ t, status }) {
      return h('span', { className: 'lsa-chip', 'data-tone': STATUS_TONE[status] || 'muted' },
        h('span', { className: 'lsa-dot', style: { background: 'currentColor', width: '6px', height: '6px' } }),
        statusLabel(t, status),
      )
    }

    function PriorityMark({ t, priority }) {
      return h('span', { className: 'lsa-prio', 'data-priority': String(priority || 2), title: t('priorityLabel') + ': ' + t(PRIORITY_KEYS[priority] || 'priorityNormal') },
        h('i', null),
        t(PRIORITY_KEYS[priority] || 'priorityNormal'),
      )
    }

    function StatPill({ t, labelKey, value, tone }) {
      return h('span', { className: 'lsa-stat', 'data-tone': tone || 'default' },
        h('span', { className: 'lsa-stat-value' }, value),
        h('span', { className: 'lsa-stat-label' }, t(labelKey)),
      )
    }

    function Topbar(props) {
      const { t, board, settingsWritable, busy, refreshing, settingsOpen, onToggleSettings, onTogglePause, onRefresh, settingsPopover, settingsWrapRef, settingsPopoverId } = props
      const paused = board && board.settings && board.settings.paused
      return h('header', { className: 'lsa-topbar' },
        h('div', { className: 'lsa-brand' },
          h('span', { className: 'lsa-logo' }, h(Icon, { name: 'brand', size: 19 })),
          h('div', { className: 'lsa-brand-text' },
            h('h1', { className: 'lsa-title' }, t('title')),
            h('p', { className: 'lsa-subtitle', title: t('subtitle') }, t('compactSubtitle')),
          ),
        ),
        h('div', { className: 'lsa-top-actions' },
          h('button', {
            type: 'button', className: 'lsa-iconbtn', title: settingsWritable ? t('pausedHint') : t('globalSettingsReload'),
            'aria-pressed': paused ? 'true' : 'false',
            disabled: !board || !settingsWritable || busy,
            'aria-label': t(paused ? 'resume' : 'pause'),
            onClick: onTogglePause,
          }, h(Icon, { name: paused ? 'play' : 'pause', size: 16 })),
          h('button', {
            type: 'button', className: 'lsa-iconbtn', title: t('refreshHint'), disabled: refreshing,
            onClick: onRefresh,
          }, refreshing ? h(Spinner, { size: 14 }) : h(Icon, { name: 'refresh', size: 16 })),
          h('div', { className: 'lsa-popwrap', ref: settingsWrapRef },
            h('button', {
              type: 'button', className: 'lsa-iconbtn', title: t('globalSettings'),
              disabled: !board,
              'aria-label': t('globalSettings'),
              'aria-expanded': settingsOpen, 'aria-controls': settingsPopoverId,
              onClick: onToggleSettings,
            }, h(Icon, { name: 'settings', size: 16 })),
            settingsOpen ? settingsPopover : null,
          ),
        ),
      )
    }

    function WorkspaceFilter(props) {
      const { t, workspaces, selected, onSelect, addOpen, onToggleAdd, addWrapRef, addPopoverId, addPopover } = props
      return h('div', { className: 'lsa-wsfilter', role: 'group', 'aria-label': t('workspaces') },
        h('button', {
          type: 'button', className: 'lsa-wschip', 'aria-pressed': selected === '',
          onClick: () => onSelect(''),
        }, h(Icon, { name: 'layers', size: 14 }), h('span', { className: 'lsa-wschip-name' }, t('allWorkspaces'))),
        workspaces.map(workspace => h('button', {
          key: workspace.id, type: 'button', className: 'lsa-wschip',
          'aria-pressed': selected === workspace.id,
          title: workspace.path || workspace.title || '',
          onClick: () => onSelect(workspace.id),
        },
          h(Icon, { name: 'folder', size: 14 }),
          h('span', { className: 'lsa-wschip-name' }, workspace.title || workspace.path || workspace.id),
        )),
        h('div', { className: 'lsa-popwrap', ref: addWrapRef },
          h('button', {
            type: 'button', className: 'lsa-wschip lsa-wschip-add',
            'aria-expanded': addOpen, 'aria-controls': addPopoverId,
            onClick: onToggleAdd, title: t('addWorkspaceHint'),
          }, h(Icon, { name: 'plus', size: 14 }), t('addWorkspace')),
          addOpen ? addPopover : null,
        ),
      )
    }

    function SuperagentManager({ t, board, workspaceId, selectedId, onSelect, busy, onAdd, onRename, onRemove }) {
      const [editing, setEditing] = React.useState('')
      const [title, setTitle] = React.useState('')
      const [targetWorkspace, setTargetWorkspace] = React.useState(workspaceId || '')
      const [error, setError] = React.useState('')
      const [confirming, setConfirming] = React.useState(false)
      const [menuOpen, setMenuOpen] = React.useState(false)
      const actionsId = useUid('lsa-agent-actions')
      const rootRef = React.useRef(null)
      const actionButtonRef = React.useRef(null)
      const createButtonRef = React.useRef(null)
      const selected = board.superagents.find(agent => agent.id === selectedId)
      const agents = board.superagents.filter(agent => !workspaceId || agent.workspaceId === workspaceId)
      const selectedWorkspace = selected && board.workspaces.find(item => item.id === selected.workspaceId)
      const hasOpenTasks = Boolean(selected && board.tasks.some(task => task.superagentId === selected.id && !ENDED_STATUSES.includes(task.status)))
      const close = (restore = true) => {
        const target = editing === 'add' ? createButtonRef : actionButtonRef
        setMenuOpen(false); setEditing(''); setConfirming(false); setError('')
        if (restore) target.current?.focus({ preventScroll: true })
      }
      React.useEffect(() => { close(false); setTargetWorkspace(workspaceId || '') }, [workspaceId, selectedId])
      React.useEffect(() => {
        if (!menuOpen && !editing) return
        const outside = event => { if (rootRef.current && !rootRef.current.contains(event.target)) close(false) }
        document.addEventListener('pointerdown', outside)
        return () => document.removeEventListener('pointerdown', outside)
      }, [menuOpen, editing])
      const begin = mode => {
        setEditing(mode); setTitle(mode === 'rename' ? selected.title : '')
        setMenuOpen(mode === 'rename'); setError(''); setConfirming(false)
      }
      const submit = async event => {
        event.preventDefault()
        if (busy) return
        if (!title.trim() || title.trim().length > 120) { setError(t('nameRequired')); return }
        if (editing === 'add' && !targetWorkspace) { setError(t('taskWorkspaceRequired')); return }
        if (editing !== 'add' && !selected) return
        const ok = editing === 'add' ? await onAdd({ workspaceId: targetWorkspace, title: title.trim() }) : await onRename({ id: selected.id, title: title.trim() })
        if (ok) close(); else setError(t('actionFailed'))
      }
      const remove = async () => {
        if (!selected || busy || hasOpenTasks || !confirming) return
        if (await onRemove(selected.id)) close(); else setError(t('actionFailed'))
      }
      const editor = h('form', { className: 'lsa-agent-form', onSubmit: submit, 'aria-label': t(editing === 'add' ? 'addSuperagent' : 'renameSuperagent') },
        editing === 'add' ? h(Field, { id: actionsId + '-workspace', label: t('workspace'), required: true }, h('select', { id: actionsId + '-workspace', className: 'lsa-select', value: targetWorkspace, autoFocus: !targetWorkspace, disabled: busy, onChange: event => setTargetWorkspace(event.target.value) },
          h('option', { value: '' }, t('taskWorkspaceRequired')), board.workspaces.map(item => h('option', { key: item.id, value: item.id }, item.title || item.path || item.id)))) : null,
        h(Field, { id: actionsId + '-name', label: t('superagentTitle'), required: true }, h('input', { id: actionsId + '-name', className: 'lsa-input', value: title, maxLength: 120, autoFocus: editing !== 'add' || Boolean(targetWorkspace), disabled: busy, onChange: event => setTitle(event.target.value) })),
        h('button', { type: 'submit', className: 'lsa-btn lsa-btn-primary lsa-btn-sm', disabled: busy }, busy ? h(Spinner, {}) : null, t('save')),
        h('button', { type: 'button', className: 'lsa-btn lsa-btn-sm', disabled: busy, onClick: () => close() }, t('cancel')),
      )
      return h('section', { ref: rootRef, className: 'lsa-agent-section', 'aria-label': t('superagents'), onKeyDown: event => {
        if (event.key !== 'Escape' || (!menuOpen && !editing && !confirming)) return
        event.preventDefault(); event.stopPropagation(); close()
      } },
        h('div', { className: 'lsa-agent-nav' },
          h('h2', { className: 'lsa-agent-label' }, t('superagents')),
          h('div', { className: 'lsa-agent-rail', role: 'group', 'aria-label': t('superagents') },
            h('button', { type: 'button', className: 'lsa-agent-tab', 'aria-pressed': !selectedId, title: t('aggregateHint'), onClick: () => onSelect('') }, h(Icon, { name: 'layers', size: 13 }), t('allSuperagents')),
            agents.map(agent => h('div', { key: agent.id, className: 'lsa-agent-option' }, h('button', { type: 'button', className: 'lsa-agent-tab', 'aria-pressed': selectedId === agent.id, title: agent.title + ' · ' + agent.workspaceId + ' · ' + agent.id, onFocus: event => event.currentTarget.scrollIntoView?.({ block: 'nearest', inline: 'nearest' }), onClick: () => onSelect(agent.id) },
              h('span', { className: 'lsa-dot', 'data-state': agent.settings.paused ? 'paused' : agent.supervisor?.running ? 'running' : 'idle', title: t(agent.settings.paused ? 'pause' : agent.supervisor?.running ? 'supervisorRunning' : 'supervisorIdle') }),
              h('span', { className: 'lsa-agent-name' }, agent.title),
              !workspaceId || agents.some(other => other.id !== agent.id && other.title === agent.title) ? h('span', { className: 'lsa-agent-scope' }, board.workspaces.find(item => item.id === agent.workspaceId)?.title || agent.workspaceId, agents.some(other => other.id !== agent.id && other.title === agent.title && other.workspaceId === agent.workspaceId) ? ' · ' + agent.id.slice(-6) : '') : null,
              agent.live?.needsYou > 0 ? h('span', { className: 'lsa-count', title: t('needsYouTitle') }, agent.live.needsYou) : null,
            ),
              agent.id === selectedId ? h('button', { type: 'button', className: 'lsa-iconbtn lsa-agent-more', ref: actionButtonRef, 'aria-label': t('superagentActions') + ' · ' + selected.title, title: t('superagentActions') + ' · ' + selected.title, 'aria-haspopup': 'dialog', 'aria-expanded': menuOpen, 'aria-controls': actionsId, onClick: () => { if (menuOpen) close(); else { setMenuOpen(true); setEditing(''); setConfirming(false); setError('') } } }, '⋯') : null,
            )),
          ),
          h('button', { type: 'button', className: 'lsa-btn lsa-btn-sm lsa-agent-create', ref: createButtonRef, 'aria-label': t('addSuperagent'), 'aria-expanded': editing === 'add', 'aria-controls': actionsId + '-create', disabled: busy || !board.multiSuperagent || !board.workspaces.length, onClick: () => { if (editing === 'add') close(); else begin('add') } }, h(Icon, { name: 'plus', size: 13 }), t('createSuperagentShort')),
          menuOpen && selected ? h('div', { id: actionsId, className: 'lsa-agent-popup', role: 'dialog', 'aria-label': t('superagentActions') + ' · ' + selected.title },
            h('div', { className: 'lsa-agent-popup-head' }, h('strong', null, selected.title), h('button', { type: 'button', className: 'lsa-iconbtn', title: t('close'), onClick: () => close() }, h(Icon, { name: 'close', size: 13 }))),
            h('p', { className: 'lsa-help' }, (selectedWorkspace?.title || selected.workspaceId) + ' · ' + selected.id),
            editing === 'rename' ? editor : confirming ? h('div', { className: 'lsa-agent-confirm' },
              h('p', null, fill(t('confirmSuperagentRemoval'), { name: selected.title })),
              h('p', { className: 'lsa-help' }, t('removeSuperagentHint')),
              h('div', { className: 'lsa-form-actions' },
                h('button', { type: 'button', className: 'lsa-btn lsa-btn-sm lsa-btn-danger', disabled: busy || hasOpenTasks, onClick: remove }, t('confirmRemoveSuperagent')),
                h('button', { type: 'button', className: 'lsa-btn lsa-btn-sm', disabled: busy, onClick: () => close() }, t('cancel'))),
            ) : h('div', { className: 'lsa-agent-menu', role: 'menu', 'aria-label': selected.title },
              h('button', { type: 'button', role: 'menuitem', className: 'lsa-btn lsa-btn-sm', disabled: busy, onClick: () => begin('rename') }, t('renameSuperagent')),
              h('button', { type: 'button', role: 'menuitem', className: 'lsa-btn lsa-btn-sm lsa-btn-danger', disabled: busy || hasOpenTasks, title: hasOpenTasks ? t('removeSuperagentHint') : '', onClick: () => { if (!busy && !hasOpenTasks) { setConfirming(true); setError('') } } }, t('removeSuperagent')),
              hasOpenTasks ? h('p', { className: 'lsa-help' }, t('removeSuperagentHint')) : null,
            ),
            error ? h('p', { role: 'alert', className: 'lsa-error-text' }, error) : null,
          ) : null,
        ),
        !board.multiSuperagent ? h('p', { className: 'lsa-scope-label' }, t('legacyHint')) : !agents.length ? h('p', { className: 'lsa-scope-label' }, t('noSuperagents')) : null,
        selected ? h('div', { className: 'lsa-agent-summary' },
          h('span', { title: selectedWorkspace?.path }, h(Icon, { name: 'folder', size: 12 }), selectedWorkspace?.title || selected.workspaceId),
          h('span', { title: modelKey(selected.settings.models.supervisor) || t('followDefault') }, h(Icon, { name: 'sparkle', size: 12 }), shortModelLabel(selected.settings.models.supervisor) || t('followDefault')),
          h('span', null, t('metricRunning') + ' ' + (selected.live?.running || 0) + '/' + selected.settings.maxWorkers),
          selected.settings.paused ? h('span', null, t('pausedNotice')) : null,
          selected.settings.autonomy.enabled ? h('span', { title: t('autonomyHint') }, t('autonomy') + ' · ' + selected.settings.autonomy.waitMinutes + ' min') : null,
        ) : null,
        editing === 'add' ? h('div', { id: actionsId + '-create', className: 'lsa-agent-editor' }, editor, error ? h('p', { role: 'alert', className: 'lsa-error-text' }, error) : null) : null,
      )
    }

    function TaskEntry({ t, open, onOpen, buttonRef, containerRef, disabled, children }) {
      return h('section', { className: 'lsa-task-entry', ref: containerRef, 'aria-label': t('newTaskSection') },
        h('button', { type: 'button', className: 'lsa-btn lsa-btn-primary', ref: buttonRef, disabled, onClick: onOpen, 'aria-label': t('newTaskShort'), 'aria-expanded': open, 'aria-controls': 'lsa-task-composer' }, h(Icon, { name: 'plus', size: 14 }), t('newTaskShort')),
        children,
      )
    }

    function SearchBox({ t, value, onChange }) {
      return h('div', { className: 'lsa-search' },
        h(Icon, { name: 'search', size: 14 }),
        h('input', {
          type: 'search', value, placeholder: t('searchPlaceholder'),
          'aria-label': t('searchPlaceholder'), onChange: event => onChange(event.target.value),
        }),
        value ? h('button', {
          type: 'button', className: 'lsa-search-clear', title: t('searchClear'),
          onClick: () => onChange(''),
        }, h(Icon, { name: 'close', size: 12 })) : null,
      )
    }

    function Field({ id, label, required, counter, error, hint, children }) {
      return h('div', { className: 'lsa-field' },
        h('div', { className: 'lsa-label-row' },
          h('label', { className: 'lsa-label', htmlFor: id }, label, required ? h('span', { className: 'lsa-req' }, '*') : null),
          counter ? h('span', { className: 'lsa-counter', 'data-over': counter.over ? 'true' : 'false' }, counter.text) : null,
        ),
        children,
        error ? h('span', { className: 'lsa-error-text' }, h(Icon, { name: 'alert', size: 12 }), error) : null,
        hint && !error ? h('span', { className: 'lsa-help' }, hint) : null,
      )
    }

    function Switch({ checked, disabled, onClick, title, hint, label }) {
      return h('div', { className: 'lsa-switch-row' },
        h('div', { className: 'lsa-switch-text' },
          h('div', { className: 'lsa-switch-title' }, label),
          hint ? h('div', { className: 'lsa-switch-hint' }, hint) : null,
        ),
        h('button', {
          type: 'button', className: 'lsa-switch', role: 'switch',
          'aria-checked': checked ? 'true' : 'false', 'aria-label': label,
          disabled: Boolean(disabled), onClick, title,
        }),
      )
    }

    function Segmented({ value, options, onChange, label, disabled, className }) {
      return h('div', { className: 'lsa-seg' + (className ? ' ' + className : ''), role: 'group', 'aria-label': label },
        options.map(option => h('button', {
          key: option.value, type: 'button',
          'aria-pressed': String(value) === String(option.value),
          'data-prio': option.value,
          disabled,
          onClick: () => onChange(option.value),
        },
          option.dot ? h('span', { className: 'lsa-prio-dot' }) : null,
          option.label,
        )),
      )
    }

    function TaskCard({ t, task, now, onOpen }) {
      const progress = latestProgress(task)
      const elapsed = elapsedFor(task, now)
      const review = task.review
      const showProgress = progress && ['queued', 'running', 'reviewing'].includes(task.status)
      const showQuestion = task.status === 'needs_you' && task.question
      const showReview = review && ['done', 'failed', 'cancelled'].includes(task.status)
      const noteTone = task.status === 'done' ? 'success' : task.status === 'failed' ? 'error' : 'warn'
      const attemptLabel = task.attempts > 1 ? fill(t('attemptShort'), { n: task.attempts }) : ''
      return h('button', {
        type: 'button', className: 'lsa-card', 'data-status': task.status,
        onClick: () => onOpen(task.id), title: t('openTask'),
      },
        h('div', { className: 'lsa-card-head' },
          h('span', { className: 'lsa-card-title' }, task.title || ''),
          h(StatusChip, { t, status: task.status }),
          h(PriorityMark, { t, priority: task.priority }),
          h(Icon, { name: 'chevronRight', size: 14, className: 'lsa-card-chevron' }),
        ),
        h('div', { className: 'lsa-card-meta' },
          h('span', null, h(Icon, { name: 'folder', size: 11 }), task.workspaceTitle || t('workspace')),
          h('span', { title: task.superagentId || '' }, t('supervisorLabel') + ': ' + task.superagentTitle),
          attemptLabel ? h('span', null, '· ' + attemptLabel) : null,
          task.workerModel ? h('span', { className: 'lsa-card-model', title: t('workerModel') + ': ' + modelKey(task.workerModel) }, shortModelLabel(task.workerModel)) : null,
          h('span', null, '· ' + t(elapsedKey(task.status)) + ' ' + formatDuration(elapsed)),
        ),
        showProgress ? h('div', { className: 'lsa-card-progress' },
          h(Icon, { name: 'clock', size: 12 }),
          h('span', { className: 'lsa-card-progress-text' }, progress.text || ''),
        ) : null,
        task.status === 'needs_you' || task.autonomyReviewPending ? h('div', { className: 'lsa-waiting' },
          h('span', { className: 'lsa-card-question-text', title: task.question?.text || '' }, task.question?.text || t('noQuestion')),
          h('span', { className: 'lsa-card-detail-link' }, t('viewDetail'), ' →'),
        ) : null,
        showReview && review.note ? h('div', { className: 'lsa-card-note', 'data-tone': noteTone },
          h(Icon, { name: noteTone === 'success' ? 'check' : noteTone === 'error' ? 'alert' : 'info', size: 13 }),
          h('span', null, review.note),
        ) : null,
      )
    }

    function TaskColumn({ t, titleKey, tone, count, emptyText, extra, children }) {
      const items = React.Children.toArray(children).filter(Boolean)
      return h('section', { className: 'lsa-col', 'data-tone': tone, 'aria-label': t(titleKey) },
        h('div', { className: 'lsa-col-head' },
          h('span', { className: 'lsa-col-dot' }),
          h('span', { className: 'lsa-col-title' }, t(titleKey)),
          h('span', { className: 'lsa-count' }, count),
          extra || null,
        ),
        h('div', { className: 'lsa-col-list' },
          items.length > 0 ? items : h('div', { className: 'lsa-col-empty' }, emptyText || t('columnEmpty')),
        ),
      )
    }

    function AttentionPanel({ t, tasks, answers, busyKey, onAnswerChange, onAnswer, onOpen, now }) {
      const [expanded, setExpanded] = React.useState(true)
      const [errors, setErrors] = React.useState({})
      const [submittingId, setSubmittingId] = React.useState('')
      const submittingRef = React.useRef(false)
      const regionId = useUid('lsa-attention')
      const submit = async task => {
        if (busyKey || submittingRef.current) return
        const value = (answers[task.id] || '').trim()
        if (!value) { setErrors(current => ({ ...current, [task.id]: t('noAnswer') })); return }
        submittingRef.current = true
        setSubmittingId(task.id)
        setErrors(current => ({ ...current, [task.id]: '' }))
        try {
          const ok = await onAnswer(task.id, value)
          if (!ok) setErrors(current => ({ ...current, [task.id]: t('actionFailed') }))
        } catch (error) {
          setErrors(current => ({ ...current, [task.id]: errorText(t, errorInfo(error)) }))
        } finally {
          submittingRef.current = false
          setSubmittingId('')
        }
      }
      return h('section', { className: 'lsa-needs', 'aria-label': t('needsYouTitle') },
        h('div', { className: 'lsa-needs-head' },
          h('span', { className: 'lsa-needs-icon' }, h(Icon, { name: 'help', size: 15 })),
          h('h2', { className: 'lsa-needs-title' }, t('needsYouTitle')),
          h('span', { className: 'lsa-needs-count' }, tasks.length),
          h('button', { type: 'button', className: 'lsa-btn lsa-btn-sm', 'aria-expanded': expanded, 'aria-controls': regionId, onClick: () => setExpanded(value => !value) },
            h(Icon, { name: expanded ? 'chevronDown' : 'chevronRight', size: 13 }), t(expanded ? 'collapse' : 'answerSection')),
        ),
        h('div', { id: regionId, className: 'lsa-needs-list', hidden: !expanded },
          tasks.map(task => {
            const value = answers[task.id] || ''
            const busy = submittingId === task.id || busyKey === 'answer:' + task.id
            const inputId = regionId + '-answer-' + task.id
            const errorId = inputId + '-error'
            return h('article', { key: task.id, className: 'lsa-needs-card', 'aria-label': task.title },
              h('div', { className: 'lsa-needs-card-head' },
                h('h3', { className: 'lsa-needs-card-title' }, task.title || ''),
                h('span', { className: 'lsa-needs-card-meta', title: task.workspaceTitle || '' }, task.superagentTitle),
                h('button', { type: 'button', className: 'lsa-btn lsa-btn-sm', onClick: () => onOpen(task.id) }, t('viewDetail')),
              ),
              h('p', { id: inputId + '-question', className: 'lsa-attention-question' }, task.question?.text || t('noQuestion')),
              h('label', { className: 'lsa-sr', htmlFor: inputId }, t('answerLabel') + ' · ' + task.title + ' · ' + task.superagentTitle),
              h('textarea', { id: inputId, className: 'lsa-textarea', rows: 2, value, disabled: busy,
                placeholder: t('answerPlaceholder'), 'aria-invalid': errors[task.id] ? 'true' : 'false', 'aria-describedby': inputId + '-question' + (errors[task.id] ? ' ' + errorId : ''),
                onChange: event => { onAnswerChange(task.id, event.target.value); setErrors(current => ({ ...current, [task.id]: '' })) },
                onKeyDown: event => {
                  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && !event.nativeEvent?.isComposing) { event.preventDefault(); return submit(task) }
                },
              }),
              errors[task.id] ? h('span', { id: errorId, className: 'lsa-error-text', role: 'alert' }, errors[task.id]) : null,
              h('div', { className: 'lsa-answer-actions' },
                h('button', { type: 'button', className: 'lsa-btn lsa-btn-primary lsa-btn-sm', disabled: Boolean(busyKey) || Boolean(submittingId) || !value.trim(), onClick: () => submit(task) }, busy ? h(Spinner, { size: 12 }) : h(Icon, { name: 'send', size: 13 }), t(busy ? 'submittingAnswer' : 'submitAnswer')),
                h('span', { className: 'lsa-help' }, t('answersHint')),
                task.autonomyReviewPending || task.autonomy?.attempted || task.ownerSettings?.autonomy?.enabled ? h('span', { className: 'lsa-help lsa-attention-timer' }, waitingText(task, task.ownerSettings, now, t)) : null,
              ),
            )
          }),
        ),
      )
    }

    function TaskComposer({ t, workspaces, superagents, defaultSuperagentId, defaultWorkspaceId, busyKey, open, onToggle, onSubmit }) {
      const [form, setForm] = React.useState({ title: '', goal: '', acceptance: '', priority: 2, workspaceId: defaultWorkspaceId || '', superagentId: defaultSuperagentId || '' })
      const [errors, setErrors] = React.useState({})
      const busy = busyKey === 'task.add'
      const firstFieldRef = React.useRef(null)

      React.useEffect(() => {
        const owner = superagents.find(agent => agent.id === defaultSuperagentId)
        setForm(current => ({ ...current, workspaceId: owner?.workspaceId || defaultWorkspaceId || '', superagentId: owner?.id || '' }))
      }, [defaultWorkspaceId, defaultSuperagentId])

      React.useEffect(() => {
        if (open && firstFieldRef.current) {
          const timer = setTimeout(() => { try { firstFieldRef.current.focus() } catch (error) { /* ignore */ } }, 30)
          return () => clearTimeout(timer)
        }
        return undefined
      }, [open])

      const update = (key, value) => setForm(current => ({ ...current, [key]: value }))
      const validate = () => {
        const next = {}
        if (!form.title.trim()) next.title = t('taskTitleRequired')
        else if (form.title.trim().length > 200) next.title = t('taskTitleTooLong')
        if (!form.goal.trim()) next.goal = t('taskGoalRequired')
        else if (form.goal.trim().length > 8000) next.goal = t('taskGoalTooLong')
        if (form.acceptance.trim().length > 4000) next.acceptance = t('taskAcceptanceTooLong')
        if (!form.workspaceId) next.workspaceId = t('taskWorkspaceRequired')
        if (!superagents.some(agent => agent.id === form.superagentId && agent.workspaceId === form.workspaceId)) next.superagentId = t('superagentRequired')
        setErrors(next)
        return Object.keys(next).length === 0
      }
      const submit = async () => {
        if (busy || !validate()) return
        const ok = await onSubmit({
          workspaceId: form.workspaceId,
          superagentId: form.superagentId,
          title: form.title.trim(),
          goal: form.goal.trim(),
          acceptance: form.acceptance.trim(),
          priority: Number(form.priority) || 2,
        })
        if (ok) {
          setForm(current => ({ ...current, title: '', goal: '', acceptance: '', priority: 2 }))
          setErrors({})
        }
      }
      const onKeyDown = event => {
        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
          event.preventDefault()
          submit()
        }
      }
      const counter = (value, max) => ({ text: value.length + ' / ' + max, over: value.length > max })
      if (!open) return null

      return h('section', { id: 'lsa-task-composer', className: 'lsa-panel', 'aria-label': t('newTaskSection') },
        h('div', { className: 'lsa-panel-pad' },
          h('div', { className: 'lsa-panel-head' },
            h('div', { className: 'lsa-panel-title' },
              h(Icon, { name: 'sparkle', size: 16 }),
              t('newTaskSection'),
            ),
            h('div', { className: 'lsa-panel-actions' }, h('button', { type: 'button', className: 'lsa-iconbtn', title: t('close'), onClick: onToggle }, h(Icon, { name: 'close', size: 14 }))),
          ),
          open ? h('div', { className: 'lsa-form', style: { marginTop: '12px' } },
            h(Field, {
              id: 'lsa-task-title', label: t('taskTitle'), required: true,
              counter: counter(form.title, 200), error: errors.title,
            }, h('input', {
              id: 'lsa-task-title', ref: firstFieldRef, className: 'lsa-input',
              value: form.title, maxLength: 240, placeholder: t('taskTitlePlaceholder'),
              'aria-invalid': errors.title ? 'true' : 'false', onKeyDown,
              onChange: event => update('title', event.target.value),
            })),
            h('div', { className: 'lsa-grid-2' },
              h(Field, {
                id: 'lsa-task-goal', label: t('taskGoal'), required: true,
                counter: counter(form.goal, 8000), error: errors.goal,
              }, h('textarea', {
                id: 'lsa-task-goal', className: 'lsa-textarea', rows: 4,
                value: form.goal, placeholder: t('taskGoalPlaceholder'), onKeyDown,
                'aria-invalid': errors.goal ? 'true' : 'false',
                onChange: event => update('goal', event.target.value),
              })),
              h(Field, {
                id: 'lsa-task-acceptance', label: t('taskAcceptance'),
                counter: counter(form.acceptance, 4000), error: errors.acceptance,
              }, h('textarea', {
                id: 'lsa-task-acceptance', className: 'lsa-textarea', rows: 4,
                value: form.acceptance, placeholder: t('taskAcceptancePlaceholder'), onKeyDown,
                'aria-invalid': errors.acceptance ? 'true' : 'false',
                onChange: event => update('acceptance', event.target.value),
              })),
            ),
            h('div', { className: 'lsa-grid-2' },
              h(Field, { id: 'lsa-task-workspace', label: t('taskWorkspace'), error: errors.workspaceId },
                h('select', {
                  id: 'lsa-task-workspace', className: 'lsa-select', value: form.workspaceId,
                  'aria-invalid': errors.workspaceId ? 'true' : 'false',
                  onChange: event => setForm(current => ({ ...current, workspaceId: event.target.value, superagentId: '' })),
                }, h('option', { value: '' }, t('taskWorkspaceRequired')), workspaces.map(workspace => h('option', {
                  key: workspace.id, value: workspace.id,
                }, workspace.title || workspace.path || workspace.id))),
              ),
              h('div', { className: 'lsa-field' },
                h('span', { className: 'lsa-label' }, t('priorityLabel')),
                h(Segmented, {
                  value: form.priority, label: t('priorityLabel'),
                  className: 'lsa-seg-start',
                  options: [
                    { value: 1, label: t('priorityLow'), dot: true },
                    { value: 2, label: t('priorityNormal'), dot: true },
                    { value: 3, label: t('priorityHigh'), dot: true },
                  ],
                  onChange: value => update('priority', value),
                }),
              ),
            ),
            h(Field, { id: 'lsa-task-agent', label: t('supervisorLabel'), required: true, error: errors.superagentId },
              h('select', { id: 'lsa-task-agent', className: 'lsa-select', value: form.superagentId, disabled: busy, 'aria-invalid': errors.superagentId ? 'true' : 'false', onChange: event => update('superagentId', event.target.value) },
                h('option', { value: '' }, t('superagentRequired')),
                superagents.filter(agent => agent.workspaceId === form.workspaceId).map(agent => h('option', { key: agent.id, value: agent.id }, agent.title + ' · ' + agent.id))),
            ),
            h('div', { className: 'lsa-form-actions' },
              h('button', {
                type: 'button', className: 'lsa-btn lsa-btn-primary', disabled: busy, onClick: submit,
              }, busy ? h(Spinner, { size: 13 }) : h(Icon, { name: 'plus', size: 14 }), busy ? t('taskSubmitting') : t('taskSubmit')),
              h('button', {
                type: 'button', className: 'lsa-btn', disabled: busy, onClick: onToggle,
              }, t('cancel')),
              h('span', { className: 'lsa-help' }, t('queueHint')),
            ),
          ) : null,
        ),
      )
    }

    function AddWorkspacePopover({ t, id, busy, error, onClose, onSubmit }) {
      const [path, setPath] = React.useState('')
      const [title, setTitle] = React.useState('')
      const [localError, setLocalError] = React.useState('')
      const submit = () => {
        const value = path.trim()
        if (!isAbsolutePath(value)) {
          setLocalError(t('workspacePathInvalid'))
          return
        }
        setLocalError('')
        onSubmit({ path: value, ...(title.trim() ? { title: title.trim() } : {}) })
      }
      return h('div', { className: 'lsa-popover', id, role: 'dialog', 'aria-label': t('addWorkspaceSection') },
        h('div', { className: 'lsa-popover-head' },
          h('span', { className: 'lsa-popover-title' }, t('addWorkspaceSection')),
          h('button', { type: 'button', className: 'lsa-iconbtn', onClick: onClose, title: t('close') }, h(Icon, { name: 'close', size: 14 })),
        ),
        h(Field, { id: 'lsa-ws-path', label: t('workspacePath'), required: true, error: localError || error || '' },
          h('input', {
            id: 'lsa-ws-path', className: 'lsa-input', value: path,
            placeholder: t('workspacePathPlaceholder'),
            'aria-invalid': localError || error ? 'true' : 'false',
            onChange: event => { setPath(event.target.value); setLocalError('') },
            onKeyDown: event => { if (event.key === 'Enter') { event.preventDefault(); submit() } },
          }),
        ),
        h(Field, { id: 'lsa-ws-title', label: t('workspaceTitle'), hint: t('addWorkspaceHint') },
          h('input', {
            id: 'lsa-ws-title', className: 'lsa-input', value: title,
            placeholder: t('workspaceTitlePlaceholder'),
            onChange: event => setTitle(event.target.value),
            onKeyDown: event => { if (event.key === 'Enter') { event.preventDefault(); submit() } },
          }),
        ),
        h('div', { className: 'lsa-form-actions' },
          h('button', { type: 'button', className: 'lsa-btn lsa-btn-primary', disabled: busy, onClick: submit },
            busy ? h(Spinner, { size: 13 }) : h(Icon, { name: 'plus', size: 13 }),
            busy ? t('workspaceAdding') : t('workspaceAdd')),
          h('button', { type: 'button', className: 'lsa-btn', disabled: busy, onClick: onClose }, t('cancel')),
        ),
      )
    }

    function SettingsPopover(props) {
      const { t, id, scopeTitle, settings, supervisor, stateDir, version, busyKey, catalog, catalogLoading, catalogError, onSave, onSaveModels, onRefreshModels, onTogglePause, onClose } = props
      const [minutes, setMinutes] = React.useState(String(settings.autonomy.waitMinutes))
      const [waitError, setWaitError] = React.useState('')
      const saveAutonomy = () => {
        const value = Number(minutes)
        if (!minutes.trim() || !Number.isInteger(value) || value < 1 || value > 1440) { setWaitError(t('waitInvalid')); return }
        setWaitError('')
        onSave({ autonomy: { ...settings.autonomy, waitMinutes: value } })
      }
      const savingWorkers = Boolean(busyKey)
      const savingReview = Boolean(busyKey)
      const savingModels = Boolean(busyKey)
      const models = settings.models || { supervisor: null, workers: [] }
      const selectedWorkers = new Set(models.workers.map(modelKey))
      const groups = catalog && catalog.available ? catalog.groups : []
      const configuredSupervisor = models.supervisor
      const configuredSupervisorKey = modelKey(configuredSupervisor)
      const supervisorKnown = configuredSupervisor
        ? groups.some(group => group.id === configuredSupervisor.provider && group.models.some(model => model.id === configuredSupervisor.model))
        : false
      const pickSupervisor = key => {
        if (!key) {
          onSaveModels({ supervisor: null })
          return
        }
        const group = groups.find(item => key.startsWith(item.id + '/'))
        if (!group) return
        onSaveModels({ supervisor: { provider: group.id, model: key.slice(group.id.length + 1) } })
      }
      const toggleWorker = (provider, model) => {
        const key = provider + '/' + model
        const workers = selectedWorkers.has(key)
          ? models.workers.filter(item => modelKey(item) !== key)
          : [...models.workers, { provider, model }]
        onSaveModels({ workers })
      }
      const makeDefault = key => {
        const entry = models.workers.find(item => modelKey(item) === key)
        if (!entry) return
        if (models.workers[0] && modelKey(models.workers[0]) === key) return
        onSaveModels({ workers: [entry, ...models.workers.filter(item => modelKey(item) !== key)] })
      }
      const catalogProblem = catalogError || (catalog && catalog.reason ? catalog.reason : '')
      const modelStatus = h('span', { className: 'lsa-help' },
        catalogLoading
          ? t('modelsLoading')
          : catalogProblem || (catalog && catalog.available ? '' : t('modelsEmpty')))
      return h('div', { className: 'lsa-popover', id, role: 'dialog', 'aria-label': t('settingsTitle') },
        h('div', { className: 'lsa-popover-head' },
          h('span', { className: 'lsa-popover-title' }, t('globalSettings')),
          h('button', { type: 'button', className: 'lsa-iconbtn', onClick: onClose, title: t('close') }, h(Icon, { name: 'close', size: 14 })),
        ),
        h('div', { className: 'lsa-field' },
          h('span', { className: 'lsa-label' }, t('maxWorkers')),
          h(Segmented, {
            value: settings.maxWorkers, label: t('maxWorkers'),
            disabled: savingWorkers,
            options: [1, 2, 3, 4].map(value => ({ value, label: String(value) })),
            onChange: value => onSave({ maxWorkers: value }),
          }),
          h('span', { className: 'lsa-help' }, t('maxWorkersHint')),
        ),
        h(Switch, {
          checked: settings.autoReview, disabled: savingReview,
          label: t('autoReview'), hint: t('autoReviewHint'),
          onClick: () => onSave({ autoReview: !settings.autoReview }),
        }),
        h(Switch, {
          checked: settings.paused, disabled: Boolean(busyKey),
          label: t('pause'), hint: t('pausedHint'),
          onClick: onTogglePause,
        }),
        h(Switch, {
          checked: settings.autonomy.enabled, disabled: Boolean(busyKey),
          label: t('autonomy'), hint: t('autonomyHint'),
          onClick: () => onSave({ autonomy: { ...settings.autonomy, enabled: !settings.autonomy.enabled } }),
        }),
        h(Field, { id: 'lsa-autonomy-minutes', label: t('waitMinutes'), error: waitError },
          h('input', { id: 'lsa-autonomy-minutes', className: 'lsa-input', type: 'number', min: 1, max: 1440, step: 1, value: minutes, disabled: Boolean(busyKey), 'aria-invalid': waitError ? 'true' : 'false', onChange: event => setMinutes(event.target.value) }),
          h('button', { type: 'button', className: 'lsa-btn lsa-btn-sm', disabled: Boolean(busyKey), onClick: saveAutonomy }, busyKey === 'settings.autonomy' ? h(Spinner, {}) : null, t('save')),
        ),
        h('div', { className: 'lsa-popover-sep' }),
        h('div', { className: 'lsa-field' },
          h('span', { className: 'lsa-label' }, t('supervisorModel')),
          h('select', {
            className: 'lsa-select', value: configuredSupervisorKey,
            disabled: savingModels || catalogLoading,
            'aria-label': t('supervisorModel'),
            onChange: event => pickSupervisor(event.target.value),
          },
            h('option', { value: '' }, t('followDefault')),
            configuredSupervisor && !supervisorKnown
              ? h('option', { value: configuredSupervisorKey, disabled: true }, configuredSupervisorKey + ' (' + t('modelsUnavailable') + ')')
              : null,
            groups.map(group => h('optgroup', { key: group.id, label: group.name },
              group.models.map(model => h('option', { key: group.id + '/' + model.id, value: group.id + '/' + model.id }, model.name)))),
          ),
          catalogLoading || catalogProblem || !(catalog && catalog.available)
            ? modelStatus
            : null,
          h('span', { className: 'lsa-help' }, t('supervisorModelHint')),
        ),
        h('div', { className: 'lsa-field' },
          h('div', { className: 'lsa-label-row' },
            h('span', { className: 'lsa-label' }, t('workerModels')),
            h('span', { className: 'lsa-counter' }, String(models.workers.length)),
          ),
          catalogLoading
            ? h('div', { className: 'lsa-model-list' }, h('span', { className: 'lsa-help' }, t('modelsLoading')))
            : groups.length > 0
              ? h('div', { className: 'lsa-model-list' },
                groups.map(group => h('div', { className: 'lsa-model-group', key: group.id },
                  h('div', { className: 'lsa-model-groupname' }, group.name),
                  group.models.map(model => {
                    const key = group.id + '/' + model.id
                    const checked = selectedWorkers.has(key)
                    const isDefault = checked && models.workers.length > 0 && modelKey(models.workers[0]) === key
                    return h('div', { className: 'lsa-model-row', key },
                      h('label', { className: 'lsa-model-checklabel' },
                        h('input', {
                          type: 'checkbox', className: 'lsa-check', checked,
                          disabled: savingModels,
                          onChange: () => toggleWorker(group.id, model.id),
                        }),
                        h('span', { className: 'lsa-model-name', title: key }, model.name),
                      ),
                      isDefault ? h('span', { className: 'lsa-tag' }, t('modelDefaultTag')) : null,
                      checked && !isDefault
                        ? h('button', {
                          type: 'button', className: 'lsa-model-defaultbtn',
                          disabled: savingModels,
                          onClick: () => makeDefault(key),
                        }, t('setAsDefault'))
                        : null,
                    )
                  }),
                )),
              )
              : h('div', { className: 'lsa-model-list' }, modelStatus),
          h('span', { className: 'lsa-help' }, t('workerModelsHint')),
          h('div', { className: 'lsa-model-actions' },
            h('span', { className: 'lsa-help' }, savingModels ? t('savingModels') : ''),
            h('button', {
              type: 'button', className: 'lsa-btn lsa-btn-sm',
              disabled: savingModels || catalogLoading, onClick: onRefreshModels,
            }, catalogLoading ? h(Spinner, { size: 12 }) : h(Icon, { name: 'refresh', size: 12 }), t('refreshModels')),
          ),
        ),
        h('div', { className: 'lsa-meta-list' },
          h('div', { className: 'lsa-meta-line' },
            h('span', null, t('supervisor')),
            h('span', { className: 'lsa-meta-line-value' },
              (supervisor ? (supervisor.running ? t('supervisorRunning') : t('supervisorIdle')) : t('supervisorUnavailable'))),
          ),
          h('div', { className: 'lsa-meta-line' },
            h('span', null, t('supervisorModel')),
            h('span', { className: 'lsa-meta-line-value' }, configuredSupervisorKey || t('followDefault')),
          ),
          h('div', { className: 'lsa-meta-line' },
            h('span', null, t('scopeModelsLabel')),
            h('span', { className: 'lsa-meta-line-value' }, models.workers.length > 0
              ? models.workers.map(modelKey).join(' · ')
              : t('inheritSupervisor')),
          ),
          h('div', { className: 'lsa-meta-line' },
            h('span', null, t('stateDir')),
            h('span', { className: 'lsa-meta-line-value' }, stateDir || '—'),
          ),
          h('div', { className: 'lsa-meta-line' },
            h('span', null, t('version')),
            h('span', { className: 'lsa-meta-line-value' }, version || '—'),
          ),
        ),
      )
    }

    function CopyRow({ t, value }) {
      const [copied, setCopied] = React.useState(false)
      const inputRef = React.useRef(null)
      const copy = async () => {
        const text = String(value || '')
        if (!text) return
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text)
            setCopied(true)
            setTimeout(() => setCopied(false), 1800)
            return
          }
        } catch (error) { /* fall through to manual selection */ }
        const input = inputRef.current
        if (input) {
          try { input.focus(); input.select() } catch (error) { /* ignore */ }
        }
      }
      return h('div', { className: 'lsa-copy-row' },
        h('input', { ref: inputRef, className: 'lsa-input', readOnly: true, value: value || '', 'aria-label': t('workerSession') }),
        h('button', { type: 'button', className: 'lsa-btn lsa-btn-sm', onClick: copy },
          h(Icon, { name: copied ? 'check' : 'copy', size: 13 }),
          copied ? t('sessionCopied') : t('sessionCopy')),
      )
    }

    function KindLabel({ t, kind }) {
      const labels = {
        create: 'kindCreate', dispatch: 'kindDispatch', report: 'kindReport', review: 'kindReview',
        answer: 'kindAnswer', error: 'kindError', timeout: 'kindTimeout', recover: 'kindRecover',
        retry: 'kindRetry', stop: 'kindStop',
      }
      return labels[kind] ? t(labels[kind]) : kind
    }

    function DetailDrawer(props) {
      const { t, task, log, logLoading, logError, busyKey, confirmingDelete, onRequestDelete, onCancelDelete, onConfirmDelete, onClose, onAnswer, onRetry, onStop } = props
      const drawerRef = React.useRef(null)
      const [answer, setAnswer] = React.useState('')
      const answerBusy = busyKey === 'answer:' + task.id
      const retryBusy = busyKey === 'retry:' + task.id
      const stopBusy = busyKey === 'stop:' + task.id
      const removeBusy = busyKey === 'remove:' + task.id
      const isRunning = task.status === 'running' || task.status === 'reviewing'
      const canRetry = !isRunning
      const showAnswer = task.status === 'needs_you' || task.autonomyReviewPending === true
      const entries = Array.isArray(log) ? log : []

      React.useEffect(() => {
        const node = drawerRef.current
        if (node) {
          try { node.focus({ preventScroll: true }) } catch (error) { /* ignore */ }
        }
      }, [])

      const submitAnswer = async () => {
        const value = answer.trim()
        if (!value || answerBusy) return
        const ok = await onAnswer(task.id, value)
        if (ok) setAnswer('')
      }

      return h('aside', { className: 'lsa-drawer', role: 'complementary', 'aria-label': t('detailTitle'), ref: drawerRef, tabIndex: -1 },
        h('div', { className: 'lsa-drawer-head' },
          h('div', { className: 'lsa-drawer-titles' },
            h('h2', { className: 'lsa-drawer-title' }, task.title || ''),
            h('div', { className: 'lsa-drawer-sub' },
              h(StatusChip, { t, status: task.status }),
              h('span', null, task.workspaceTitle || ''),
              h('span', { title: task.superagentId || '' }, t('supervisorLabel') + ': ' + task.superagentTitle),
            ),
          ),
          h('button', { type: 'button', className: 'lsa-iconbtn', title: t('closeDetail'), onClick: onClose },
            h(Icon, { name: 'close', size: 15 })),
        ),
        h('div', { className: 'lsa-drawer-body' },
          showAnswer ? h('div', { className: 'lsa-sec' },
            h('div', { className: 'lsa-sec-title' },
              h(Icon, { name: 'help', size: 12 }), t('answerSection')),
            h('div', { className: 'lsa-help' }, waitingText(task, task.ownerSettings, Date.now(), t)),
            h('div', { className: 'lsa-question' },
              h(Icon, { name: 'help', size: 14 }),
              h('span', { className: 'lsa-question-text' }, (task.question && task.question.text) || t('noQuestion')),
            ),
            h('div', { className: 'lsa-answer-row' },
              h('textarea', {
                className: 'lsa-textarea', rows: 3, value: answer,
                placeholder: t('answerPlaceholder'), 'aria-label': t('answerLabel'),
                disabled: answerBusy,
                onChange: event => setAnswer(event.target.value),
                onKeyDown: event => {
                  if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault()
                    submitAnswer()
                  }
                },
              }),
              h('div', { className: 'lsa-answer-actions' },
                h('button', {
                  type: 'button', className: 'lsa-btn lsa-btn-primary lsa-btn-sm',
                  disabled: answerBusy || !answer.trim(), onClick: submitAnswer,
                }, answerBusy ? h(Spinner, { size: 12 }) : h(Icon, { name: 'send', size: 13 }),
                  answerBusy ? t('submittingAnswer') : t('submitAnswer')),
                h('span', { className: 'lsa-help' }, t('answerHint')),
              ),
            ),
          ) : null,
          h('div', { className: 'lsa-sec' },
            h('div', { className: 'lsa-sec-title' }, h(Icon, { name: 'list', size: 12 }), t('overview')),
            h('div', { className: 'lsa-kv' },
              h('div', { className: 'lsa-kv-item' },
                h('span', { className: 'lsa-kv-term' }, t('workspace')),
                h('span', { className: 'lsa-kv-value' }, task.workspaceTitle || '—')),
              h('div', { className: 'lsa-kv-item' },
                h('span', { className: 'lsa-kv-term' }, t('attempts')),
                h('span', { className: 'lsa-kv-value' }, String(task.attempts || 0))),
              h('div', { className: 'lsa-kv-item' },
                h('span', { className: 'lsa-kv-term' }, t('workerModel')),
                h('span', { className: 'lsa-kv-value' }, task.workerModel ? modelKey(task.workerModel) : t('inheritSupervisor'))),
              h('div', { className: 'lsa-kv-item' },
                h('span', { className: 'lsa-kv-term' }, t('createdAt')),
                h('span', { className: 'lsa-kv-value' }, formatTime(task.createdAt))),
              h('div', { className: 'lsa-kv-item' },
                h('span', { className: 'lsa-kv-term' }, t('startedLabel')),
                h('span', { className: 'lsa-kv-value' }, task.startedAt ? formatTime(task.startedAt) : '—')),
              h('div', { className: 'lsa-kv-item' },
                h('span', { className: 'lsa-kv-term' }, t('finishedAt')),
                h('span', { className: 'lsa-kv-value' }, task.finishedAt ? formatTime(task.finishedAt) : '—')),
            ),
          ),
          h('div', { className: 'lsa-sec' },
            h('div', { className: 'lsa-sec-title' }, h(Icon, { name: 'sparkle', size: 12 }), t('goal')),
            h('div', { className: 'lsa-text' }, task.goal || ''),
          ),
          h('div', { className: 'lsa-sec' },
            h('div', { className: 'lsa-sec-title' }, h(Icon, { name: 'check', size: 12 }), t('acceptance')),
            h('div', { className: 'lsa-text' }, task.acceptance || t('noAcceptance')),
          ),
          h('div', { className: 'lsa-sec' },
            h('div', { className: 'lsa-sec-title' }, h(Icon, { name: 'info', size: 12 }), t('report')),
            h('div', { className: 'lsa-sec-body' },
              task.report ? h('div', { className: 'lsa-report' },
                h('div', { className: 'lsa-report-head' },
                  h('span', { className: 'lsa-chip', 'data-tone': REPORT_TONE[task.report.state] || 'muted' },
                    t(REPORT_KEYS[task.report.state] || 'stateReady')),
                  h('span', { className: 'lsa-help' }, formatTime(task.report.at)),
                ),
                h('div', { className: 'lsa-text' }, task.report.summary || ''),
                Array.isArray(task.report.deliverables) && task.report.deliverables.length
                  ? h('div', { className: 'lsa-deliv' }, task.report.deliverables.map((item, index) => h('code', { key: index }, item)))
                  : null,
                task.report.question ? h('div', { className: 'lsa-question' },
                  h(Icon, { name: 'help', size: 13 }),
                  h('span', { className: 'lsa-question-text' }, task.report.question)) : null,
              ) : h('span', { className: 'lsa-help' }, t('noReport')),
            ),
          ),
          h('div', { className: 'lsa-sec' },
            h('div', { className: 'lsa-sec-title' }, h(Icon, { name: 'check', size: 12 }), t('review')),
            h('div', { className: 'lsa-sec-body' },
              task.review ? h('div', { className: 'lsa-report' },
                h('div', { className: 'lsa-report-head' },
                  h('span', { className: 'lsa-chip', 'data-tone': VERDICT_TONE[task.review.verdict] || 'muted' },
                    t(VERDICT_KEYS[task.review.verdict] || 'verdictDone')),
                  h('span', { className: 'lsa-help' }, formatTime(task.review.at)),
                ),
                task.review.note ? h('div', { className: 'lsa-text' }, task.review.note) : null,
              ) : h('span', { className: 'lsa-help' }, t('noReview')),
            ),
          ),
          h('div', { className: 'lsa-sec' },
            h('div', { className: 'lsa-sec-title' }, h(Icon, { name: 'bolt', size: 12 }), t('workerSession')),
            task.workerSessionId ? h(CopyRow, { t, value: task.workerSessionId }) : h('span', { className: 'lsa-help' }, t('noSession')),
          ),
          h('div', { className: 'lsa-sec' },
            h('div', { className: 'lsa-sec-title' }, h(Icon, { name: 'clock', size: 12 }), t('progressLog')),
            logLoading ? h('span', { className: 'lsa-help', role: 'status' }, t('loading')) : null,
            logError ? h('span', { className: 'lsa-error-text', role: 'alert' }, logError) : null,
            entries.length === 0
              ? h('span', { className: 'lsa-help' }, t('noProgress'))
              : h('ol', { className: 'lsa-timeline' },
                entries.map((entry, index) => h('li', {
                  key: String(entry.at) + ':' + index, className: 'lsa-tl', 'data-kind': entry.kind || 'event',
                },
                  h('span', { className: 'lsa-tl-dot' }),
                  h('div', { className: 'lsa-tl-body' },
                    h('div', { className: 'lsa-tl-head' },
                      h('span', { className: 'lsa-tl-kind' }, KindLabel({ t, kind: entry.kind })),
                      h('span', null, formatTime(entry.at)),
                    ),
                    h('div', { className: 'lsa-tl-text' }, entry.text || ''),
                  ),
                )),
              ),
          ),
          confirmingDelete ? h('div', { className: 'lsa-confirm' },
            h('div', { className: 'lsa-panel-title' }, h(Icon, { name: 'alert', size: 14 }), t('confirmDelete')),
            h('div', { className: 'lsa-help' }, t('confirmDeleteHint')),
            h('div', { className: 'lsa-confirm-actions' },
              h('button', {
                type: 'button', className: 'lsa-btn lsa-btn-danger', disabled: removeBusy, onClick: onConfirmDelete,
              }, removeBusy ? h(Spinner, { size: 12 }) : h(Icon, { name: 'trash', size: 13 }),
                removeBusy ? t('deleting') : t('confirmDeleteYes')),
              h('button', { type: 'button', className: 'lsa-btn', disabled: removeBusy, onClick: onCancelDelete }, t('cancel')),
            ),
          ) : null,
        ),
        h('div', { className: 'lsa-drawer-foot' },
          canRetry ? h('button', {
            type: 'button', className: 'lsa-btn', disabled: retryBusy, onClick: () => onRetry(task.id),
          }, retryBusy ? h(Spinner, { size: 12 }) : h(Icon, { name: 'retry', size: 13 }), t('retryTask')) : null,
          !ENDED_STATUSES.includes(task.status) ? h('button', {
            type: 'button', className: 'lsa-btn', disabled: stopBusy, onClick: () => onStop(task.id),
          }, stopBusy ? h(Spinner, { size: 12 }) : h(Icon, { name: 'stop', size: 13 }), t('stop')) : null,
          h('span', { className: 'lsa-spacer' }),
          h('button', {
            type: 'button', className: 'lsa-iconbtn lsa-btn-danger',
            title: t('deleteTask'), onClick: onRequestDelete, disabled: removeBusy,
          }, h(Icon, { name: 'trash', size: 15 })),
        ),
      )
    }

    function EmptyArt({ kind }) {
      const box = (x, y, w, height, dashed) => h('rect', {
        x, y, width: w, height, rx: 6, fill: 'none',
        stroke: 'currentColor', strokeWidth: 1.4, strokeDasharray: dashed ? '3 3' : undefined, opacity: dashed ? .5 : .9,
      })
      return h('svg', { className: 'lsa-empty-art', width: 132, height: 76, viewBox: '0 0 132 76', fill: 'none', 'aria-hidden': true },
        box(10, 18, 34, 22, false), box(48, 12, 34, 28, false), box(86, 20, 34, 20, false),
        box(10, 44, 34, 20, true), box(48, 44, 34, 20, true), box(86, 44, 34, 20, true),
        h('path', { d: 'M60 6l2.4 6.5L69 15l-6.6 2.5L60 24l-2.4-6.5L51 15l6.6-2.5z', stroke: 'currentColor', strokeWidth: 1.2, opacity: .75 }),
        kind === 'search'
          ? h('circle', { cx: 118, cy: 9, r: 6, stroke: 'currentColor', strokeWidth: 1.4, opacity: .8 })
          : null,
      )
    }

    function EmptyState({ t, kind, title, hint, action }) {
      return h('div', { className: 'lsa-empty' },
        h(EmptyArt, { kind }),
        h('div', { className: 'lsa-empty-title' }, title),
        hint ? h('div', { className: 'lsa-empty-hint' }, hint) : null,
        action || null,
      )
    }

    function LoadingSkeleton({ t }) {
      return h('div', { className: 'lsa-loading', 'aria-busy': 'true', 'aria-label': t('loading') },
        h('div', { className: 'lsa-skeleton-card' },
          h('span', { className: 'lsa-skeleton-line lsa-skeleton-line-lg' }),
          h('span', { className: 'lsa-skeleton-line lsa-skeleton-line-sm' }),
        ),
        h('div', { className: 'lsa-skeleton-cols' },
          [0, 1, 2].map(index => h('div', { key: index, className: 'lsa-skeleton-card' },
            h('span', { className: 'lsa-skeleton-line lsa-skeleton-line-lg' }),
            h('span', { className: 'lsa-skeleton-line' }),
            h('span', { className: 'lsa-skeleton-line' }),
            h('span', { className: 'lsa-skeleton-line lsa-skeleton-line-sm' }),
          )),
        ),
      )
    }

    function ToastStack({ t, toasts, onDismiss }) {
      return h('div', { className: 'lsa-toasts', 'aria-live': 'polite' },
        toasts.map(toast => h('div', { key: toast.id, className: 'lsa-toast', 'data-tone': toast.tone || 'info', role: 'status' },
          h(Icon, { name: toast.tone === 'error' ? 'alert' : toast.tone === 'success' ? 'check' : 'info', size: 15 }),
          h('span', { className: 'lsa-toast-text' }, toast.text),
          h('button', { type: 'button', className: 'lsa-iconbtn', title: t('dismiss'), onClick: () => onDismiss(toast.id) },
            h(Icon, { name: 'close', size: 12 })),
        )),
      )
    }

    /* --------------------------------------------------------------------- */
    /* page                                                                  */
    /* --------------------------------------------------------------------- */

    const ENDED_STATUSES = ['done', 'failed', 'cancelled']

    class PanelBoundary extends React.Component {
      constructor(props) {
        super(props)
        this.state = { error: null }
      }

      static getDerivedStateFromError(error) {
        return { error }
      }

      componentDidCatch(error, info) {
        try {
          console.error('[local-superagent] panel crashed', error, info)
        } catch (ignored) { /* ignore */ }
      }

      render() {
        if (this.state.error) {
          const message = this.state.error && (this.state.error.stack || this.state.error.message)
            ? String(this.state.error.stack || this.state.error.message)
            : String(this.state.error)
          return h('div', { className: 'lsa-page' },
            h('style', null, css),
            h('div', { className: 'lsa-shell' },
              h('div', { className: 'lsa-empty' },
                h('div', { className: 'lsa-empty-title' }, this.props.t('panelCrashed')),
                h('div', { className: 'lsa-empty-hint', style: { whiteSpace: 'pre-wrap', textAlign: 'left', maxWidth: '900px', fontFamily: 'ui-monospace, monospace', fontSize: '11px' } }, message),
                h('button', {
                  type: 'button', className: 'lsa-btn lsa-btn-primary',
                  onClick: () => this.setState({ error: null }),
                }, this.props.t('offlineRetry')),
              ),
            ),
          )
        }
        return this.props.children
      }
    }

    function byPriorityThenUpdated(left, right) {
      const priority = (right.priority || 2) - (left.priority || 2)
      return priority !== 0 ? priority : (right.updatedAt || 0) - (left.updatedAt || 0)
    }

    function Page({ t }) {
      const [board, setBoard] = React.useState(null)
      const [loadError, setLoadError] = React.useState(null)
      const [refreshing, setRefreshing] = React.useState(true)
      const [busyKey, setBusyKey] = React.useState('')
      const [workspaceId, setWorkspaceId] = React.useState('')
      const [superagentId, setSuperagentId] = React.useState('')
      const selectedSuperagent = board?.superagents.find(agent => agent.id === superagentId) || null
      const globalSettingsRef = React.useRef(false)
      globalSettingsRef.current = board?.settingsScope === 'global'
      const [query, setQuery] = React.useState('')
      const [composerOpen, setComposerOpen] = React.useState(false)
      const [addWorkspaceOpen, setAddWorkspaceOpen] = React.useState(false)
      const [addWorkspaceError, setAddWorkspaceError] = React.useState('')
      const [settingsOpen, setSettingsOpen] = React.useState(false)
      const [selectedTaskId, setSelectedTaskId] = React.useState('')
      const [detailLog, setDetailLog] = React.useState([])
      const [detailError, setDetailError] = React.useState('')
      const [detailLoading, setDetailLoading] = React.useState(false)
      const [confirmDelete, setConfirmDelete] = React.useState(false)
      const [endedFilter, setEndedFilter] = React.useState('all')
      const [answers, setAnswers] = React.useState({})
      const [toasts, setToasts] = React.useState([])
      const [modelCatalog, setModelCatalog] = React.useState(null)
      const [modelCatalogLoading, setModelCatalogLoading] = React.useState(false)
      const [modelCatalogError, setModelCatalogError] = React.useState('')

      const actionInFlightRef = React.useRef(false)
      const inFlightRef = React.useRef(false)
      const dirtyRef = React.useRef(false)
      const mountedRef = React.useRef(true)
      const loadRef = React.useRef(null)
      const lastFocusRef = React.useRef(null)
      const settingsWrapRef = React.useRef(null)
      const addWorkspaceWrapRef = React.useRef(null)
      const composerRef = React.useRef(null)
      const taskEntryButtonRef = React.useRef(null)
      const closeComposer = React.useCallback(() => {
        setComposerOpen(false)
        taskEntryButtonRef.current?.focus({ preventScroll: true })
      }, [])
      const toastSeq = React.useRef(0)

      const dismissToast = React.useCallback(id => {
        setToasts(current => current.filter(toast => toast.id !== id))
      }, [])

      const pushToast = React.useCallback((text, tone = 'info') => {
        toastSeq.current += 1
        const id = 'toast-' + toastSeq.current
        setToasts(current => [...current.slice(-2), { id, text, tone }])
        window.setTimeout(() => {
          setToasts(current => current.filter(toast => toast.id !== id))
        }, 4200)
      }, [])

      const loadBoard = React.useCallback(async () => {
        if (inFlightRef.current) {
          dirtyRef.current = true
          return
        }
        inFlightRef.current = true
        setRefreshing(true)
        try {
          const snapshot = await invoke('board')
          if (!mountedRef.current) return
          setBoard(normalizeBoard(snapshot))
          setLoadError(null)
        } catch (error) {
          if (!mountedRef.current) return
          setLoadError(errorInfo(error))
        } finally {
          inFlightRef.current = false
          if (mountedRef.current) setRefreshing(false)
          if (dirtyRef.current) {
            dirtyRef.current = false
            if (mountedRef.current && loadRef.current) loadRef.current()
          }
        }
      }, [])

      const openDetail = React.useCallback(id => {
        lastFocusRef.current = typeof document !== 'undefined' ? document.activeElement : null
        setSelectedTaskId(id)
        setDetailLog([])
        setDetailError('')
        setConfirmDelete(false)
      }, [])

      const closeDetail = React.useCallback(() => {
        setSelectedTaskId('')
        setConfirmDelete(false)
        const target = lastFocusRef.current
        lastFocusRef.current = null
        if (target && typeof target.focus === 'function' && target.isConnected !== false) {
          try {
            target.focus({ preventScroll: true })
          } catch (error) {
            try { target.focus() } catch (cause) { /* ignore */ }
          }
        }
      }, [])

      const runAction = React.useCallback(async (key, action, payload, successKey) => {
        if (actionInFlightRef.current) return null
        actionInFlightRef.current = true
        setBusyKey(key)
        try {
          const data = await invoke(action, payload)
          if (successKey) pushToast(t(successKey), 'success')
          if (loadRef.current) await loadRef.current()
          return data === undefined ? true : data
        } catch (error) {
          const info = errorInfo(error)
          pushToast(errorText(t, info) || t('actionFailed'), 'error')
          if (info.code === 'offline') setLoadError(info)
          return null
        } finally {
          actionInFlightRef.current = false
          setBusyKey('')
        }
      }, [pushToast, t])

      const answerTask = React.useCallback(async (id, text) => {
        const trimmed = typeof text === 'string' ? text.trim() : ''
        if (!trimmed) return false
        const result = await runAction('answer:' + id, 'task.answer', { id, text: trimmed }, 'answered')
        if (!result) return false
        setAnswers(current => {
          if (!current[id]) return current
          const next = { ...current }
          delete next[id]
          return next
        })
        return true
      }, [runAction])

      const retryTask = React.useCallback(async id => (
        Boolean(await runAction('retry:' + id, 'task.retry', { id }, 'retried'))
      ), [runAction])

      const stopTask = React.useCallback(async id => (
        Boolean(await runAction('stop:' + id, 'task.stop', { id }, 'stopped'))
      ), [runAction])

      const removeTask = React.useCallback(async id => {
        const result = await runAction('remove:' + id, 'task.remove', { id }, 'deleted')
        if (result) closeDetail()
        return Boolean(result)
      }, [runAction, closeDetail])

      const addTask = React.useCallback(async payload => {
        const result = await runAction('task.add', 'task.add', payload, 'taskAdded')
        if (!result) return false
        pushToast(t('taskQueuedHint'), 'info')
        setComposerOpen(false)
        return true
      }, [runAction, pushToast, t])

      const addWorkspace = React.useCallback(async payload => {
        setAddWorkspaceError('')
        const result = await runAction('workspace.add', 'workspace.add', payload, 'workspaceAdded')
        if (!result) {
          setAddWorkspaceError(t('workspacePathInvalid'))
          return false
        }
        if (result.workspace && result.workspace.id) setWorkspaceId(result.workspace.id)
        setAddWorkspaceOpen(false)
        return true
      }, [runAction, t])

      const saveSettings = React.useCallback(async patch => {
        if (board?.settingsScope !== 'global') return false
        const key = patch.models !== undefined ? 'settings.models'
          : patch.maxWorkers !== undefined ? 'settings.maxWorkers' : patch.autonomy !== undefined ? 'settings.autonomy' : 'settings.autoReview'
        return Boolean(await runAction(key, 'settings.save', patch, 'settingsSaved'))
      }, [runAction, board])

      const addSuperagent = async payload => {
        const result = await runAction('superagent.add', 'superagent.add', payload, 'superagentSaved')
        if (result?.superagent?.id) { setWorkspaceId(result.superagent.workspaceId); setSuperagentId(result.superagent.id) }
        return Boolean(result)
      }
      const renameSuperagent = payload => runAction('superagent.update', 'superagent.update', payload, 'superagentSaved')
      const removeSuperagent = async id => {
        const result = await runAction('superagent.remove', 'superagent.remove', { id }, 'superagentRemoved')
        if (result) setSuperagentId('')
        return Boolean(result)
      }

      const loadModelCatalog = React.useCallback(async () => {
        if (!globalSettingsRef.current) return null
        setModelCatalogLoading(true)
        setModelCatalogError('')
        try {
          const data = await invoke('models.catalog')
          if (!mountedRef.current || !globalSettingsRef.current) return null
          const catalog = normalizeModelCatalog(data)
          setModelCatalog(catalog)
          return catalog
        } catch (error) {
          if (!mountedRef.current || !globalSettingsRef.current) return null
          setModelCatalog(null)
          setModelCatalogError(errorText(t, errorInfo(error)) || t('modelsUnavailable'))
          return null
        } finally {
          if (mountedRef.current) setModelCatalogLoading(false)
        }
      }, [t])

      const saveModels = React.useCallback(async patch => (
        Boolean(await saveSettings({ models: patch }))
      ), [saveSettings])

      const togglePause = React.useCallback(async () => {
        if (board?.settingsScope !== 'global' || busyKey) return
        const nextPaused = !board.settings.paused
        await runAction('settings.pause', 'settings.save', { paused: nextPaused }, nextPaused ? 'pausedNotice' : 'resumedNotice')
      }, [board, busyKey, runAction])

      const handleAnswerChange = React.useCallback((id, value) => {
        const task = board?.tasks.find(item => item.id === id)
        if (!task) return
        setAnswers(current => ({ ...current, [id]: { text: value, questionKey: questionKey(task) } }))
      }, [board])

      React.useEffect(() => {
        mountedRef.current = true
        return () => { mountedRef.current = false }
      }, [])

      React.useEffect(() => {
        loadRef.current = loadBoard
      }, [loadBoard])

      React.useEffect(() => {
        const canPoll = () => typeof document === 'undefined' || document.visibilityState === 'visible'
        let timer = null
        const stop = () => {
          if (timer !== null) {
            window.clearInterval(timer)
            timer = null
          }
        }
        const start = () => {
          if (timer === null) {
            timer = window.setInterval(() => {
              if (canPoll() && loadRef.current) loadRef.current()
            }, 3000)
          }
        }
        const onVisibility = () => {
          if (canPoll()) {
            if (loadRef.current) loadRef.current()
            start()
          } else {
            stop()
          }
        }
        loadBoard()
        if (canPoll()) start()
        if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibility)
        return () => {
          stop()
          if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility)
        }
      }, [loadBoard])

      React.useEffect(() => {
        if (!settingsOpen) return
        loadModelCatalog()
      }, [settingsOpen, loadModelCatalog])

      React.useEffect(() => {
        if (!selectedTaskId) {
          setDetailLog([])
          return undefined
        }
        let cancelled = false
        setDetailLoading(true)
        setDetailError('')
        invoke('task.get', { id: selectedTaskId })
          .then(data => {
            if (cancelled) return
            setDetailLog(Array.isArray(data && data.log) ? data.log : [])
          })
          .catch(error => { if (!cancelled) setDetailError(errorText(t, errorInfo(error))) })
          .finally(() => { if (!cancelled) setDetailLoading(false) })
        return () => { cancelled = true }
      }, [selectedTaskId, board])

      React.useEffect(() => {
        const onKeyDown = event => {
          if (event.key !== 'Escape') return
          if (confirmDelete) {
            setConfirmDelete(false)
            return
          }
          if (settingsOpen) {
            setSettingsOpen(false)
            return
          }
          if (addWorkspaceOpen) {
            setAddWorkspaceOpen(false)
            return
          }
          if (selectedTaskId) {
            closeDetail()
            return
          }
          if (composerOpen) closeComposer()
        }
        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
      }, [confirmDelete, settingsOpen, selectedTaskId, composerOpen, addWorkspaceOpen, closeDetail])

      React.useEffect(() => {
        if (!settingsOpen && !addWorkspaceOpen) return undefined
        const onPointer = event => {
          const target = event.target
          if (settingsOpen && target.closest?.('.lsa-agent-tab, .lsa-wschip:not(.lsa-wschip-add)')) return
          if (settingsOpen && settingsWrapRef.current && settingsWrapRef.current.contains(target)) return
          if (addWorkspaceOpen && addWorkspaceWrapRef.current && addWorkspaceWrapRef.current.contains(target)) return
          setSettingsOpen(false)
          setAddWorkspaceOpen(false)
        }
        document.addEventListener('mousedown', onPointer)
        return () => document.removeEventListener('mousedown', onPointer)
      }, [settingsOpen, addWorkspaceOpen])

      React.useEffect(() => {
        const onKeyDown = event => {
          if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return
          const target = event.target
          const tag = target && target.tagName ? String(target.tagName).toLowerCase() : ''
          if (tag === 'input' || tag === 'textarea' || tag === 'select' || (target && target.isContentEditable)) return
          if (event.key !== 'n' && event.key !== 'N') return
          if (selectedTaskId || settingsOpen) return
          event.preventDefault()
          openComposer()
        }
        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
      })

      React.useEffect(() => {
        if (!board) return
        if (!selectedTaskId) return
        if (!board.tasks.some(task => task.id === selectedTaskId)) closeDetail()
      }, [board, selectedTaskId, closeDetail])

      const openComposer = React.useCallback(() => { setComposerOpen(true) }, [])
      React.useEffect(() => {
        if (composerOpen) composerRef.current?.scrollIntoView?.({ block: 'nearest' })
      }, [composerOpen])

      const workspaces = board ? board.workspaces : []
      const tasks = board ? board.tasks.map(task => ({ ...task, superagentTitle: ownerTitle(task, board.superagents, t), ownerSettings: board.superagents.find(agent => agent.id === task.superagentId)?.settings })) : []
      // Bind drafts to the actual question, not just the task: a new question must
      // never display or submit an answer drafted for the previous one. The render
      // guard applies immediately, even before polling effects could run.
      const visibleAnswers = Object.fromEntries(Object.entries(answers).filter(([id, draft]) => tasks.some(task => task.id === id && draft.questionKey === questionKey(task))).map(([id, draft]) => [id, draft.text]))
      const selectedTask = selectedTaskId ? tasks.find(task => task.id === selectedTaskId) || null : null
      const scoped = scopeTasks(tasks, workspaceId, selectedSuperagent?.id || '')
      const keyword = query.trim().toLowerCase()
      const filtered = keyword
        ? scoped.filter(task => [task.title, task.goal, task.workspaceTitle, task.workspacePath]
          .filter(Boolean).join(' ').toLowerCase().includes(keyword))
        : scoped
      const queuedTasks = filtered.filter(task => task.status === 'queued').sort(byPriorityThenUpdated)
      const runningTasks = filtered.filter(task => ['running', 'reviewing', 'needs_you'].includes(task.status)).sort((left, right) => Number(right.status === 'needs_you') - Number(left.status === 'needs_you') || byPriorityThenUpdated(left, right))
      const needsTasks = filtered.filter(task => task.status === 'needs_you' || task.autonomyReviewPending === true).sort(byPriorityThenUpdated)
      const endedTasks = filtered.filter(task => ENDED_STATUSES.includes(task.status)).sort((left, right) => (right.updatedAt || 0) - (left.updatedAt || 0))
      const endedVisible = endedFilter === 'all' ? endedTasks : endedTasks.filter(task => task.status === endedFilter)
      const hasWorkspaces = workspaces.length > 0
      const hasTasks = tasks.length > 0
      const allSettled = hasWorkspaces && hasTasks && queuedTasks.length === 0 && runningTasks.length === 0 && needsTasks.length === 0
      const now = Date.now()
      const live = { running: scoped.filter(task => task.status === 'running').length, reviewing: scoped.filter(task => task.status === 'reviewing').length, queued: scoped.filter(task => task.status === 'queued').length, needsYou: scoped.filter(task => task.status === 'needs_you').length, done: scoped.filter(task => task.status === 'done').length }

      const endedEmptyText = keyword
        ? t('noSearchResultsHint')
        : endedTasks.length === 0 ? t('columnEmpty') : t('endedEmpty')

      const emptyBlock = !hasWorkspaces
        ? h(EmptyState, {
          t,
          title: t('noWorkspaces'),
          hint: t('noWorkspacesHint'),
          action: h('button', {
            type: 'button', className: 'lsa-btn lsa-btn-primary',
            onClick: () => { setAddWorkspaceOpen(true) },
          }, h(Icon, { name: 'plus', size: 14 }), t('addWorkspace')),
        })
        : !hasTasks
          ? h(EmptyState, {
            t,
            title: t('noTasks'),
            hint: t('noTasksHint'),
          })
          : filtered.length === 0
            ? (keyword
              ? h(EmptyState, {
                t, kind: 'search',
                title: t('noSearchResults'),
                hint: t('noSearchResultsHint'),
                action: h('button', {
                  type: 'button', className: 'lsa-btn',
                  onClick: () => setQuery(''),
                }, h(Icon, { name: 'close', size: 13 }), t('clearSearch')),
              })
              : h(EmptyState, {
                t,
                title: t('workspaceEmpty'),
                hint: t('workspaceEmptyHint'),
              }))
            : null

      const settingsPopoverId = 'lsa-settings-popover'
      const addWorkspacePopoverId = 'lsa-add-workspace-popover'

      return h('section', { className: 'lsa-page' },
        h('style', null, css),
        h('div', { className: 'lsa-shell' },
          h(Topbar, {
            t,
            board,
            settingsWritable: board?.settingsScope === 'global',
            busy: Boolean(busyKey),
            refreshing,
            settingsOpen,
            addWorkspaceOpen,
            settingsWrapRef,
            settingsPopoverId,
            onTogglePause: togglePause,
            onToggleSettings: () => setSettingsOpen(current => !current),
            onRefresh: () => { loadBoard() },
            settingsPopover: board?.settingsScope === 'global' ? h(SettingsPopover, {
              t,
              id: settingsPopoverId,
              settings: board.settings,
              supervisor: board.supervisor,
              stateDir: board.stateDir,
              version: board.version,
              busyKey,
              catalog: modelCatalog,
              catalogLoading: modelCatalogLoading,
              catalogError: modelCatalogError,
              onSave: saveSettings,
              onSaveModels: saveModels,
              onRefreshModels: loadModelCatalog,
              onTogglePause: togglePause,
              onClose: () => setSettingsOpen(false),
            }) : board ? h('div', { id: settingsPopoverId, className: 'lsa-popover', role: 'dialog', 'aria-label': t('globalSettings') }, h('p', { role: 'alert' }, t('globalSettingsReload')), h('button', { type: 'button', className: 'lsa-btn', onClick: () => setSettingsOpen(false) }, t('close'))) : null,
          }),
          board?.settingsScope === 'global' && board.settings.paused
            ? h('div', { className: 'lsa-banner lsa-banner-warn', role: 'status' },
              h(Icon, { name: 'pause', size: 14 }),
              h('span', null, t('pausedHint')),
              h('button', {
                type: 'button', className: 'lsa-btn lsa-btn-sm',
                disabled: busyKey === 'settings.pause', onClick: togglePause,
              }, t('resume')),
            )
            : null,
          loadError && board
            ? h('div', { className: 'lsa-banner lsa-banner-error', role: 'alert' },
              h(Icon, { name: 'alert', size: 14 }),
              h('span', null, t('errorOffline')),
              h('button', {
                type: 'button', className: 'lsa-btn lsa-btn-sm',
                onClick: () => { loadBoard() },
              }, t('offlineRetry')),
            )
            : null,
          board
            ? h('div', { className: 'lsa-toolstrip' },
              h(WorkspaceFilter, {
                t,
                workspaces,
                selected: workspaceId,
                onSelect: id => { setWorkspaceId(id); setSuperagentId(''); setEndedFilter('all') },
                addOpen: addWorkspaceOpen,
                onToggleAdd: () => { setAddWorkspaceOpen(current => !current); setSettingsOpen(false) },
                addWrapRef: addWorkspaceWrapRef,
                addPopoverId: addWorkspacePopoverId,
                addPopover: addWorkspaceOpen ? h(AddWorkspacePopover, {
                  t,
                  id: addWorkspacePopoverId,
                  busy: busyKey === 'workspace.add',
                  error: addWorkspaceError,
                  onClose: () => { setAddWorkspaceOpen(false); setAddWorkspaceError('') },
                  onSubmit: addWorkspace,
                }) : null,
              }),
              h('div', { className: 'lsa-stats' },
                h(StatPill, { t, labelKey: 'metricRunning', value: (live.running || 0) + (live.reviewing || 0), tone: (live.running || 0) + (live.reviewing || 0) > 0 ? 'warn' : 'default' }),
                h(StatPill, { t, labelKey: 'metricQueued', value: live.queued }),
                h(StatPill, { t, labelKey: 'metricNeedsYou', value: live.needsYou, tone: live.needsYou > 0 ? 'business' : 'default' }),
                h(StatPill, { t, labelKey: 'metricDone', value: live.done, tone: live.done > 0 ? 'success' : 'default' }),
              ),
              h(SearchBox, { t, value: query, onChange: setQuery }),
            )
            : null,
          board ? h(SuperagentManager, { key: workspaceId + ':' + (selectedSuperagent?.id || ''), t, board, workspaceId, selectedId: selectedSuperagent?.id || '', onSelect: id => { setSuperagentId(id) }, busy: Boolean(busyKey), onAdd: addSuperagent, onRename: renameSuperagent, onRemove: removeSuperagent }) : null,
          board ? h(TaskEntry, { t, open: composerOpen, onOpen: openComposer, buttonRef: taskEntryButtonRef, containerRef: composerRef, disabled: !hasWorkspaces },
            h(TaskComposer, { t, workspaces, superagents: board.superagents, defaultSuperagentId: selectedSuperagent?.id || '', defaultWorkspaceId: workspaceId, busyKey, open: composerOpen, onToggle: closeComposer, onSubmit: addTask }),
          ) : null,
          !board && !loadError ? h(LoadingSkeleton, { t }) : null,
          !board && loadError
            ? h(EmptyState, {
              t,
              title: t('offlineTitle'),
              hint: t('offlineHelp'),
              action: h('button', {
                type: 'button', className: 'lsa-btn lsa-btn-primary',
                disabled: refreshing, onClick: () => { loadBoard() },
              }, refreshing ? h(Spinner, { size: 13 }) : h(Icon, { name: 'refresh', size: 14 }), t('offlineRetry')),
            })
            : null,
          board
            ? h('div', { className: 'lsa-layout', 'data-detail': selectedTask ? 'true' : 'false' },
              h('div', { className: 'lsa-main-col' },
                needsTasks.length > 0 ? h(AttentionPanel, { t, tasks: needsTasks, answers: visibleAnswers, busyKey, now, onAnswerChange: handleAnswerChange, onAnswer: answerTask, onOpen: openDetail }) : null,
                allSettled && needsTasks.length === 0
                  ? h('div', { className: 'lsa-banner lsa-banner-info', role: 'status' },
                    h(Icon, { name: 'check', size: 14 }),
                    h('span', null, h('strong', null, t('allSettled')), ' · ' + t('allSettledHint')))
                  : null,
                emptyBlock || h('div', { className: 'lsa-board' },
                  h(TaskColumn, {
                    t, titleKey: 'columnQueued', tone: 'queued', count: queuedTasks.length,
                    emptyText: keyword ? t('noSearchResultsHint') : t('columnEmpty'),
                  }, queuedTasks.map(task => h(TaskCard, { key: task.id, t, task, now, onOpen: openDetail }))),
                  h(TaskColumn, {
                    t, titleKey: 'columnRunning', tone: 'running', count: runningTasks.length,
                    emptyText: keyword ? t('noSearchResultsHint') : t('columnEmpty'),
                  }, runningTasks.map(task => h(TaskCard, { key: task.id, t, task, now, onOpen: openDetail }))),
                  h(TaskColumn, {
                    t, titleKey: 'columnEnded', tone: 'ended', count: endedVisible.length,
                    emptyText: endedEmptyText,
                    extra: h('div', { className: 'lsa-filter', role: 'group', 'aria-label': t('filterLabel') },
                      ENDED_FILTERS.map(value => h('button', {
                        key: value, type: 'button',
                        'aria-pressed': endedFilter === value,
                        onClick: () => setEndedFilter(value),
                      }, t(ENDED_FILTER_KEYS[value])))),
                  }, endedVisible.map(task => h(TaskCard, { key: task.id, t, task, now, onOpen: openDetail }))),
                ),
              ),
              selectedTask
                ? h(DetailDrawer, {
                  key: selectedTask.id,
                  t,
                  task: selectedTask,
                  log: detailLog,
                  logLoading: detailLoading,
                  logError: detailError,
                  busyKey,
                  confirmingDelete: confirmDelete,
                  onRequestDelete: () => setConfirmDelete(true),
                  onCancelDelete: () => setConfirmDelete(false),
                  onConfirmDelete: () => { removeTask(selectedTask.id) },
                  onClose: closeDetail,
                  onAnswer: answerTask,
                  onRetry: retryTask,
                  onStop: stopTask,
                })
                : null,
            )
            : null,
          selectedTask ? h('div', { className: 'lsa-scrim', onClick: closeDetail, 'aria-hidden': 'true' }) : null,
        ),
        toasts.length > 0 ? h(ToastStack, { t, toasts, onDismiss: dismissToast }) : null,
      )
    }

    function SidebarIcon({ size = 20 }) {
      return h(Icon, { name: 'brand', size: Math.max(16, Math.round(size * 0.85)) })
    }

    return {
      inject: ['slots', 'locale', 'connection'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, dictionaries))
        const bound = ctx.locale.bind(NS)
        const Panel = props => h(PanelBoundary, { t: bound }, h(Page, { ...props, t: bound }))
        ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: PANEL_ID, locale: NS, inject: () => ({}) }, Panel))
        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist', id: PANEL_ID, order: 15, label: () => bound('panel'), locale: NS,
        }, SidebarIcon))
      },
    }
  },
})
