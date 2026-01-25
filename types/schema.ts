export interface Department {
    department_id: number
    dept_name: string
    college_id?: number
}

export interface College {
    college_id: number
    name: string
    dean_user_id?: number
}

export interface User {
    user_id: number
    username: string
    password_hash: string
    full_name: string
    email: string
    phone: string
    department_id: number
    is_active: boolean
    created_at: string
    delegate_user_id?: number
    delegation_start_date?: string
    delegation_end_date?: string
}

export interface Role {
    role_id: number
    role_name: string
}

export interface UserRole {
    user_id: number
    role_id: number
    assigned_at: string
}

export interface RequestType {
    type_id: number
    type_name: string
    audience: string
}

export interface Status {
    status_id: number
    status_name: string
}

export interface Workflow {
    wf_id: number
    type_id: number
    version: number
    wf_name: string
    is_active: boolean
    created_at: string
}

export interface WorkflowStage {
    stage_id: number
    wf_id: number
    seq_no: number
    stage_name: string
    sla_hours: number
}

export interface StageApproverScope {
    stage_id: number
    approver_user_id: number
    department_id: number
}

export interface Request {
    request_id: number
    requester_id: number
    type_id: number
    status_id: number
    current_stage_id: number
    reference_no: string
    subject: string
    description: string
    submitted_at: string
    updated_at: string
}

export interface ApprovalLog {
    approval_id: number
    request_id: number
    stage_id: number
    approver_id: number
    action: string
    notes: string
    action_at: string
}

export interface Attachment {
    file_id: number
    request_id: number
    uploaded_by: number
    file_name: string
    mime_type: string
    storage_path: string
    uploaded_at: string
}

export interface FormSchema {
    form_id: number
    type_id: number
    version: number
    form_name: string
    schema_json: string
    created_at: string
}

export interface FormResponse {
    response_id: number
    request_id: number
    form_id: number
    form_version: number
    response_json: string
    submitted_at: string
}

export interface Comment {
    comment_id: number
    request_id: number
    author_id: number
    body: string
    created_at: string
}
