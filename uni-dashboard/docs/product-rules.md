# UniLearn Product Rules

## Goal

UniLearn is a shared learning aid for the university student community. Students use it to maintain module study content, reuse senior-batch material when it still applies, and keep all edits attributable to a specific index number.

## Core Rules

### Authentication

- Students authenticate with their university index number and password.
- A student's index number is the identity used for accountability.
- Every write action must be attributable to the authenticated profile and recorded with the student's index number.

### Batch Ownership

- Each batch owns its own editable version of module content.
- A batch can edit only its own version.
- A batch can create its own version from scratch or clone a viewable senior-batch version into its own batch.

### Viewability

- Students can view:
  - their own batch version
  - up to 3 senior-batch versions
- Older senior-batch versions are hidden from normal product flows.
- Hidden older versions are retained in storage for now; they are not automatically deleted in the MVP.

### Editing

- A batch can edit a module only when the batch has reached that module's semester.
- The canonical rule is:
  - `batch.current_semester >= module.semester`
- Year labels are for navigation and display only. They are not the source of truth for edit permissions.

### Cloning

- A batch may clone from any viewable senior-batch version.
- Cloning creates or replaces the destination batch's version for that module.
- After cloning, the destination batch can continue editing only its own copied version.

### Lecturer Differences

- If a module has the same content and lecturer across batches, a junior batch should usually clone.
- If the lecturer or content differs, the batch can create or maintain its own separate version instead of cloning.

### Audit Logging

- Every content save must create an audit log entry.
- Every clone must create an audit log entry.
- Each log entry must store:
  - actor user id
  - actor index number
  - module id
  - batch number
  - action type
  - timestamp
  - change summary or snapshot

### Admin Controls

- Admins can advance a batch to the next semester.
- Admin actions update batch progression state but do not bypass audit requirements.

## MVP Implementation Constraints

- `module_content_versions` is the only active module content table.
- Permission enforcement must happen server-side.
- Save and clone flows must be atomic.
- UI messaging must match the backend rules exactly.
