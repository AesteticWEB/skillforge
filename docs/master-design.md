# Master Design

Краткий, но детальный дизайн-док: сущности, ивенты, состояния и карта экранов.
Маркировка: [v1] минимально жизнеспособно, [v2] расширение.

## 1) Сущности (Entities)

- [v1] PlayerProfile: id, имя, выбранная профессия, флаги прогресса.
- [v1] CareerStage: internship/junior/middle/senior + post‑senior (lead/head/cto/ceo).
- [v1] Resources: XP, Coins, Reputation, TechDebt.
- [v1] Scenario: тип, набор выборов, эффекты, награды.
- [v1] Exam: этап, набор вопросов, пороги, результаты.
- [v1] Question: текст, варианты, правильный ответ, тема.
- [v1] StoreItem: категория, цена, эффекты, требования.
- [v1] Inventory: приобретенные апгрейды, активные бонусы.
- [v1] Company: баланс, зарплаты, текущие контракты, репутация, техдолг.
- [v1] Contract: риск, базовая прибыль, требования к команде.
- [v1] Employee: роль, уровень, стоимость, вклад.
- [v1] Track: Feature/Refactor/QA/Ops/Sales.
- [v1] Ending: тип, условия, итоги.
- [v2] ProceduralSeed: seed, таблицы модификаторов, веса тем.
- [v2] Achievement: условия, косметика, мета‑награды.
- [v2] MetaProgress: NG+ множители, перки, разблокировки.

## 2) Domain Events (список)

- [v1] PlayerStartedRun
- [v1] ProfessionSelected
- [v1] ScenarioPresented
- [v1] ScenarioChoiceCommitted
- [v1] RewardsGranted (XP/Coins/Rep/Debt)
- [v1] ExamStarted
- [v1] ExamFinished (score, pass)
- [v1] StageAdvanced
- [v1] CompanyTickApplied
- [v1] StoreOpened
- [v1] StoreItemPurchased
- [v1] CompanyModeUnlocked
- [v1] EmployeeHired
- [v1] ContractSigned
- [v1] TrackAssigned
- [v1] EndingUnlocked
- [v1] RunCompleted
- [v2] ProceduralSeedGenerated
- [v2] IncidentTriggered
- [v2] IncidentResolved
- [v2] AchievementUnlocked
- [v2] NgPlusStarted

## 3) Состояния (State Model)

- [v1] GameState: текущий этап, прогресс XP, доступные действия.
- [v1] ResourceState: XP/Coins/Rep/Debt.
- [v1] ScenarioState: текущий сценарий, выбранный ответ.
- [v1] ExamState: очередь вопросов, ответы, текущий счет.
- [v1] CompanyState: сотрудники, контракты, треки, финансы.
- [v1] StoreState: список товаров, владение, скидки.
- [v1] UIState: модальные окна, тосты, активные вкладки.
- [v2] MetaState: NG+, перки, мета‑прогресс.
- [v2] AnalyticsState: события, счетчики, сессии.

## 4) Persisted Keys (список)

- [v1] profile
- [v1] resources
- [v1] careerStage
- [v1] scenarioHistory
- [v1] examHistory
- [v1] company
- [v1] inventory
- [v1] store
- [v1] settings
- [v1] runSummary
- [v2] metaProgress
- [v2] achievements
- [v2] proceduralSeed
- [v2] analyticsOptIn

## 5) Экраны (Screens)

- [v1] Home
- [v1] Profession Select
- [v1] Scenario
- [v1] Exam
- [v1] Results (stage summary)
- [v1] Store
- [v1] Company
- [v1] Contracts
- [v1] Team/Tracks
- [v1] Ending
- [v1] Settings
- [v2] NG+ Hub
- [v2] Achievements
- [v2] Incident Room
- [v2] Meta Shop

## 6) Карта экранов (Flow Map)

[v1]
Home -> Profession Select -> Scenario -> (Exam) -> Results -> Scenario ... -> Ending
Scenario -> Store
Scenario -> Company -> Contracts -> Team/Tracks -> Company
Settings доступен с Home/Scenario

[v2]
Ending -> NG+ Hub -> Scenario
Company -> Incident Room
Home -> Achievements
NG+ Hub -> Meta Shop

## 7) Примечания по версии

- [v1] Фокус на core loop: сценарии + экзамены + магазин + базовый company mode.
- [v2] Углубление мета‑прогресса, инцидентов и процедурной вариативности.
