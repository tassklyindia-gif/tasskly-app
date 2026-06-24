# Requirements Document

## Introduction

The Assignment Marketplace is a core feature of the Tasskly platform that enables users (clients) to upload assignments and have a platform-curated team accept and complete the work. Unlike the existing peer-to-peer bidding model, this feature introduces a **platform-managed team formation** model: the platform assembles a team of verified workers suited to the assignment, and the team only begins work after the client completes payment. The feature covers the full lifecycle — assignment submission, team formation, payment, work delivery, and escrow release — with admin oversight at every stage.

---

## Glossary

- **Client**: A registered user who uploads an assignment and pays for it to be completed.
- **Assignment**: A task uploaded by a Client, containing a description, files, deadline, and budget.
- **Platform**: The Tasskly system and its administrators.
- **Team**: A group of one or more verified Workers assembled by the Platform to complete an Assignment.
- **Worker**: A verified user selected by the Platform to be part of a Team.
- **Team_Lead**: The primary Worker responsible for coordinating the Team and submitting final deliverables.
- **Escrow**: A held payment amount that is released to the Team only after the Client approves the delivered work.
- **Submission**: The final deliverable files uploaded by the Team_Lead for Client review.
- **Dispute**: A state triggered when the Client declines a Submission, requiring admin resolution.
- **Admin**: A platform operator with elevated privileges to manage Teams, Escrow, and Disputes.
- **Assignment_Status**: The current lifecycle state of an Assignment (open, team_forming, payment_pending, in_progress, submitted, completed, disputed, expired).
- **Payment_Window**: The time period (5 minutes) within which the Client must complete payment after a Team is assigned.
- **Platform_Fee**: A 10% deduction from the Assignment budget retained by the Platform.
- **Worker_Payout**: 90% of the Assignment budget distributed to the Team upon escrow release.

---

## Requirements

### Requirement 1: Assignment Submission

**User Story:** As a Client, I want to upload an assignment with all relevant details and files, so that the Platform can form a suitable team to complete it.

#### Acceptance Criteria

1. THE Assignment_Submission_Form SHALL require the Client to provide a title, description, category, budget (in ₹), and deadline before submission.
2. WHEN a Client submits an Assignment, THE Assignment_Submission_Form SHALL accept one or more file attachments (PDF, DOCX, PNG, JPG, ZIP) up to 50 MB total.
3. WHEN a Client submits an Assignment without all required fields, THE Assignment_Submission_Form SHALL display a field-level validation error and prevent submission.
4. WHEN a Client submits a valid Assignment, THE Platform SHALL create the Assignment with status `open` and store all uploaded files in secure storage.
5. WHEN a Client submits a monetary Assignment, THE Platform SHALL collect a 10% posting fee via Razorpay before creating the Assignment record.
6. IF the posting fee payment fails or is cancelled, THEN THE Platform SHALL discard the Assignment data and display an error message to the Client.
7. THE Assignment_Submission_Form SHALL enforce a minimum deadline of 2 days from the current date for standard assignments.
8. WHEN an Assignment is created successfully, THE Platform SHALL notify the Admin that a new Assignment is awaiting team formation.

---

### Requirement 2: Platform-Managed Team Formation

**User Story:** As a Platform Admin, I want to review open assignments and assign a suitable team of Workers, so that Clients receive qualified help for their assignments.

#### Acceptance Criteria

1. WHEN an Assignment has status `open`, THE Admin SHALL be able to view the Assignment details, files, and required skills in the Admin panel.
2. WHEN the Admin assigns Workers to an Assignment, THE Platform SHALL update the Assignment status to `team_forming` and record each Worker's role in the Team.
3. THE Platform SHALL require at least one Worker to be designated as Team_Lead before a Team can be confirmed.
4. WHEN the Admin confirms a Team, THE Platform SHALL update the Assignment status to `payment_pending` and start the Payment_Window countdown.
5. WHEN the Admin confirms a Team, THE Platform SHALL send a notification to the Client indicating that a Team has been formed and payment is required within 5 minutes.
6. WHEN the Admin confirms a Team, THE Platform SHALL send a notification to each assigned Worker indicating they have been assigned to an Assignment pending payment.
7. THE Platform SHALL display the Team composition (Worker names and roles) to the Client on the Assignment detail page once a Team is confirmed.

---

### Requirement 3: Client Payment and Escrow

**User Story:** As a Client, I want to pay for my assignment after a team is formed, so that the team is motivated to start work and my funds are protected until I approve the deliverables.

#### Acceptance Criteria

1. WHEN an Assignment has status `payment_pending`, THE Payment_Gateway SHALL present the Client with a Razorpay checkout for the full Assignment budget amount.
2. WHEN the Client completes payment successfully, THE Platform SHALL create an Escrow record holding 90% of the budget as Worker_Payout and retaining 10% as Platform_Fee.
3. WHEN the Client completes payment successfully, THE Platform SHALL update the Assignment status to `in_progress` and unlock the Assignment files for the Team.
4. WHEN the Client completes payment successfully, THE Platform SHALL notify each Worker that the Assignment is now active and files are accessible.
5. WHILE an Assignment has status `payment_pending`, THE Platform SHALL display a countdown timer showing the remaining Payment_Window time to both the Client and the assigned Workers.
6. IF the Payment_Window expires before the Client completes payment, THEN THE Platform SHALL update the Assignment status to `expired`, remove the Team assignment, and notify both the Client and Workers that the Assignment has expired.
7. IF the payment transaction fails, THEN THE Platform SHALL display an error message to the Client and keep the Assignment in `payment_pending` status for the remainder of the Payment_Window.
8. THE Platform SHALL record every payment transaction in the Admin Ledger with the Assignment ID, amount, platform fee, worker payout, and timestamp.

---

### Requirement 4: Assignment File Access Control

**User Story:** As a Worker, I want to access assignment files only after payment is confirmed, so that my work is protected and the Client's content is secure.

#### Acceptance Criteria

1. WHILE an Assignment has status `open` or `payment_pending`, THE File_Access_Controller SHALL prevent Workers from downloading Assignment instruction files.
2. WHEN an Assignment transitions to `in_progress`, THE File_Access_Controller SHALL grant all assigned Workers read access to the Assignment instruction files.
3. WHILE an Assignment has status `in_progress` or `submitted`, THE File_Access_Controller SHALL prevent the Client from downloading Submission files until the Assignment reaches `completed` status.
4. WHEN an Assignment reaches `completed` status, THE File_Access_Controller SHALL grant the Client full download access to all Submission files.
5. THE File_Access_Controller SHALL display a "Locked — Pay to unlock" indicator to Workers attempting to access files before payment is confirmed.

---

### Requirement 5: Work Submission by Team

**User Story:** As a Team Lead, I want to submit the completed work files for the Client to review, so that the Client can approve the deliverables and trigger payment release.

#### Acceptance Criteria

1. WHILE an Assignment has status `in_progress`, THE Team_Lead SHALL be able to upload one or more Submission files (PDF, DOCX, PNG, JPG, ZIP) up to 100 MB total.
2. WHEN the Team_Lead submits work, THE Platform SHALL update the Assignment status to `submitted` and notify the Client that deliverables are ready for review.
3. WHEN the Team_Lead submits work, THE Platform SHALL store Submission files separately from instruction files and mark them as watermarked until the Client approves.
4. WHEN the Team_Lead submits work, THE Platform SHALL send a notification to the Admin indicating that a Submission is awaiting Client review.
5. IF the Team_Lead attempts to submit work when the Assignment is not in `in_progress` status, THEN THE Platform SHALL reject the submission and display an error message.

---

### Requirement 6: Client Review and Escrow Release

**User Story:** As a Client, I want to review the submitted work and approve or decline it, so that payment is released to the team only when I am satisfied with the deliverables.

#### Acceptance Criteria

1. WHEN an Assignment has status `submitted`, THE Client SHALL be presented with an "Approve Work" and a "Decline Work" action on the Assignment detail page.
2. WHEN the Client approves the work, THE Platform SHALL update the Assignment status to `completed`, release the Escrow to the Team, and unlock Submission files for Client download.
3. WHEN the Client approves the work, THE Platform SHALL credit the Worker_Payout to each Worker's wallet balance proportionally based on their assigned share.
4. WHEN the Client approves the work, THE Platform SHALL record the escrow release in the Admin Ledger with the Assignment ID, released amount, and timestamp.
5. WHEN the Client declines the work, THE Platform SHALL update the Assignment status to `disputed` and notify the Admin that a Dispute requires resolution.
6. WHEN the Client declines the work, THE Platform SHALL display a message to the Client confirming that a refund will be processed within 4 working days after Admin review.
7. WHEN the Client declines the work, THE Platform SHALL notify the Team_Lead that the work was declined and provide the Client's stated reason.

---

### Requirement 7: Dispute Resolution by Admin

**User Story:** As a Platform Admin, I want to resolve disputes between Clients and Teams, so that funds are fairly distributed and the platform maintains trust.

#### Acceptance Criteria

1. WHEN an Assignment has status `disputed`, THE Admin SHALL be able to view the Assignment details, instruction files, and Submission files in the Admin panel.
2. WHEN the Admin resolves a Dispute in favour of the Client, THE Platform SHALL refund the Worker_Payout amount to the Client's original payment method and update the Assignment status to `completed`.
3. WHEN the Admin resolves a Dispute in favour of the Team, THE Platform SHALL release the Escrow to the Team and update the Assignment status to `completed`.
4. WHEN the Admin resolves a Dispute, THE Platform SHALL notify both the Client and the Team_Lead of the resolution outcome.
5. THE Admin SHALL be able to add a resolution note when resolving a Dispute, which is stored in the Admin Ledger.

---

### Requirement 8: Assignment Lifecycle Visibility

**User Story:** As a Client, I want to track the status of my assignment at every stage, so that I always know what is happening with my work.

#### Acceptance Criteria

1. THE Assignment_Detail_Page SHALL display the current Assignment_Status to the Client at all times.
2. WHEN the Assignment_Status changes, THE Platform SHALL send a real-time notification to the Client reflecting the new status.
3. THE Assignment_Detail_Page SHALL display the Team composition (Worker names and roles) to the Client once a Team has been confirmed.
4. THE Assignment_Detail_Page SHALL display a countdown timer to the Client when the Assignment is in `payment_pending` status.
5. THE Assignment_Detail_Page SHALL display the submission review actions ("Approve Work" / "Decline Work") to the Client only when the Assignment is in `submitted` status.
6. WHEN an Assignment reaches `completed` status, THE Assignment_Detail_Page SHALL display a download link for all approved Submission files to the Client.

---

### Requirement 9: Worker Dashboard and Earnings

**User Story:** As a Worker, I want to see my assigned assignments and track my earnings, so that I can manage my workload and understand my income.

#### Acceptance Criteria

1. THE Worker_Dashboard SHALL display all Assignments the Worker is currently assigned to, grouped by status (`in_progress`, `submitted`, `completed`).
2. WHEN an Assignment is completed and escrow is released, THE Worker_Dashboard SHALL reflect the updated wallet balance within 5 seconds.
3. THE Earnings_Page SHALL display a transaction history showing each completed Assignment, the Worker_Payout amount received, and the date of release.
4. WHILE a Worker is assigned to an Assignment in `payment_pending` status, THE Worker_Dashboard SHALL display the Payment_Window countdown and a message indicating the Assignment is awaiting Client payment.

---

### Requirement 10: Admin Assignment Management

**User Story:** As a Platform Admin, I want a centralised view of all assignments and their statuses, so that I can manage team formation, escrow, and disputes efficiently.

#### Acceptance Criteria

1. THE Admin_Assignment_Panel SHALL display all Assignments with their current status, Client name, budget, deadline, and assigned Team.
2. THE Admin_Assignment_Panel SHALL allow the Admin to filter Assignments by status (open, team_forming, payment_pending, in_progress, submitted, completed, disputed, expired).
3. WHEN the Admin views an Assignment in `open` status, THE Admin_Assignment_Panel SHALL provide a team formation interface to search for and assign Workers by skill and availability.
4. THE Admin_Escrow_Panel SHALL display all Assignments with held escrow, showing the Assignment title, Worker names, and Worker_Payout amount.
5. WHEN the Admin releases escrow from the Admin_Escrow_Panel, THE Platform SHALL credit the Worker_Payout to the respective Workers' wallets and update the Admin Ledger.
6. THE Admin_Ledger SHALL record every financial transaction (posting fee, escrow held, escrow released, refund) with the Assignment ID, amount, type, and timestamp.
