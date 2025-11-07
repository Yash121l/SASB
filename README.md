# Team Structure & Organization

## 1. Team Composition & Roles

### Current Leadership
- **Project Leader:** Yash Lunawat (yash.l23csai@nst.rishihood.edu.in)
- **Responsibilities:** Overall project coordination, milestone tracking, stakeholder communication, final deliverable quality assurance

### Role Assignments

| Role | Team Member | Primary Responsibilities | Deliverables |
|------|-------------|-------------------------|--------------|
| **Data Collection/Integration** | Yash Lunawat | • Source and acquire air quality datasets (WHO, EPA, OpenAQ)<br>• Integrate multiple data sources<br>• Ensure data completeness and temporal coverage<br>• Document data provenance | • Raw datasets (CSV/JSON)<br>• Data source documentation<br>• Integration scripts |
| **Data Cleaning/Preprocessing** | Deepanshu Mehta | • Handle missing values and outliers<br>• Normalize and standardize data formats<br>• Feature engineering<br>• Create analysis-ready datasets | • Cleaned datasets<br>• Preprocessing pipeline code<br>• Data quality report |
| **Research & Literature Review** | Rishabh Gusain | • Survey existing air quality research<br>• Identify methodological approaches<br>• Document theoretical frameworks<br>• Synthesize findings for context | • Literature review document<br>• Annotated bibliography<br>• Research gap analysis |
| **Visualization Planning** | Rishabh Gusain | • Design visualization strategy<br>• Select appropriate chart types<br>• Plan interactive dashboards<br>• Ensure accessibility and clarity | • Visualization mockups<br>• Dashboard prototypes<br>• Final visualizations |
| **Documentation & Git Management** | Deepanshu Mehta | • Maintain GitHub repository<br>• Write comprehensive README<br>• Document code and processes<br>• Manage version control workflow | • GitHub repository<br>• README and documentation<br>• Commit history and branches |

---

## 2. Rotating Leadership Model

### Leadership Rotation Schedule

**Phase 1 (Weeks 1-3): Yash Lunawat**
- Focus: Project setup, data collection, initial planning
- Key decisions: Data source selection, tool choices, timeline establishment

**Phase 2 (Weeks 4-6): Deepanshu Mehta**
- Focus: Data preprocessing, pipeline development, quality assurance
- Key decisions: Preprocessing strategies, feature selection, data validation

**Phase 3 (Weeks 7-9): Rishabh Gusain**
- Focus: Analysis, visualization, research synthesis
- Key decisions: Visualization approaches, analytical methods, presentation format

**Phase 4 (Weeks 10-12): Rotating/Shared Leadership**
- Focus: Final integration, documentation, presentation preparation
- Key decisions: Final deliverable format, presentation strategy, quality checks

### Leadership Transition Protocol
- **Handoff Meeting:** 1-hour transition meeting at phase boundaries
- **Status Report:** Outgoing leader provides written status summary
- **Priority Setting:** Incoming leader sets priorities for their phase
- **Continuity:** Previous leader remains available for consultation

---

## 3. Task Tracking & Project Management

### Primary Tracking Tools

**1. GitHub Project Board**
- **URL:** [To be created at repository setup]
- **Board Structure:**
  - **Backlog:** All planned tasks
  - **To Do:** Tasks for current sprint/phase
  - **In Progress:** Currently active tasks
  - **Review:** Tasks awaiting peer review
  - **Done:** Completed tasks
- **Task Granularity:** Each task should be completable within 2-4 hours
- **Update Frequency:** Daily updates by task owners

**2. Weekly Sync Meetings**
- **Schedule:** Every Monday, 2:00 PM, 30 minutes
- **Agenda:**
  - Progress updates from each team member (5 min each)
  - Blocker identification and resolution (10 min)
  - Task assignment for upcoming week (10 min)
- **Documentation:** Meeting notes in GitHub wiki

**3. Asynchronous Communication**
- **Platform:** Slack/Discord channel (or email thread)
- **Response Time:** Within 24 hours for non-urgent, 4 hours for urgent
- **Daily Standups:** Optional async updates in shared channel

---

## 4. GitHub Repository Plan

### Repository Structure

```
air-quality-analysis/
├── README.md
├── LICENSE
├── .gitignore
├── requirements.txt
├── data/
│   ├── raw/                 # Original datasets
│   ├── processed/           # Cleaned datasets
│   └── external/            # Third-party data
├── notebooks/
│   ├── 01_data_collection.ipynb
│   ├── 02_data_cleaning.ipynb
│   ├── 03_exploratory_analysis.ipynb
│   └── 04_visualization.ipynb
├── src/
│   ├── data/
│   │   ├── collect.py
│   │   └── preprocess.py
│   ├── analysis/
│   │   └── analyze.py
│   └── visualization/
│       └── visualize.py
├── docs/
│   ├── literature_review.md
│   ├── methodology.md
│   └── meeting_notes/
├── tests/
│   └── test_data_processing.py
└── results/
    ├── figures/
    └── reports/
```

### Branching Strategy
- **main:** Production-ready code, protected branch
- **develop:** Integration branch for features
- **feature/[name]:** Individual feature branches (e.g., feature/data-cleaning)
- **hotfix/[name]:** Urgent fixes to main branch

### Commit Guidelines
- **Format:** `[TYPE] Brief description`
  - **FEAT:** New feature
  - **FIX:** Bug fix
  - **DOCS:** Documentation changes
  - **REFACTOR:** Code refactoring
  - **TEST:** Test additions
- **Example:** `[FEAT] Add WHO data collection script`
- **Frequency:** Commit at logical checkpoints, push daily

### Contribution Tracking Methods

**1. GitHub Insights**
- Use built-in GitHub contributor statistics
- Track commits, additions, deletions per member
- Monitor pull request activity

**2. Contribution Log**

| Date | Member | Contribution | Hours | Evidence (Commit/PR) |
|------|--------|--------------|-------|---------------------|
| 7/11/2025 | Deepanshu | Add initial project files including .gitignore, README, documentation, notebooks, and source scripts | 2 | [Link](https://github.com/Yash121l/SASB/commit/b327ee29488af8f1519f6189e44bbf57208871b0) |
| 7/11/2025 | Yash | Adding README | 1.5 | [Link](https://github.com/Yash121l/SASB/commit/b327ee29488af8f1519f6189e44bbf57208871b0) |

**3. Pull Request Reviews**
- All code changes require at least one peer review
- Reviewer provides constructive feedback
- Author addresses comments before merge
- Tracks engagement and code quality

**4. Weekly Progress Reports**
- Each member submits brief weekly report
- **Template:**
  - Tasks completed this week
  - Challenges encountered
  - Plans for next week
  - Hours invested
- Stored in `docs/progress_reports/`

---

## 5. Collaboration & Communication Norms

### Decision-Making Process
- **Minor decisions:** Individual team members can decide within their role
- **Major decisions:** Require team discussion and consensus (e.g., changing project scope)
- **Deadlock resolution:** Current phase leader has tie-breaking authority

### Conflict Resolution
- **Step 1:** Direct communication between involved parties
- **Step 2:** Mediation by current phase leader
- **Step 3:** Escalation to instructor/advisor if unresolved

### Quality Standards
- **Code:** PEP 8 compliance for Python, documented functions
- **Documentation:** Clear, concise, audience-appropriate
- **Data:** Validated, version-controlled, well-documented
- **Visualizations:** Accessible, properly labeled, publication-quality

---

## 6. Risk Management

| Risk | Probability | Impact | Mitigation Strategy |
|------|------------|--------|---------------------|
| Team member unavailability | Medium | High | Cross-training, documentation, backup assignments |
| Data access issues | Low | High | Multiple data sources, early data collection |
| Technical challenges | Medium | Medium | Buffer time in schedule, peer support, instructor consultation |
| Scope creep | Medium | Medium | Clear project boundaries, regular scope reviews |
| Communication breakdown | Low | High | Regular meetings, multiple communication channels |

---

## 7. Success Metrics

### Team Collaboration
- All members contribute ≥20% of total commits
- 100% attendance at weekly sync meetings (or async updates)
- All pull requests reviewed within 48 hours

### Project Management
- GitHub Project Board updated daily
- All milestones met within ±3 days of target
- Zero critical blockers unresolved for >1 week

### Documentation
- README complete and up-to-date
- All code functions documented
- Meeting notes for all sync meetings