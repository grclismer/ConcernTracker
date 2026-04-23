import { useState } from 'react'
import { supabase } from '../lib/supabase'

export type ConcernStatus = 'Submitted' | 'Routed' | 'Read' | 'Screened' | 'Resolved' | 'Escalated'
export type ConcernCategory = 'Academic' | 'Financial' | 'Welfare'

export interface AuditEntry {
  id: string
  concern_id: string
  action: string
  actor: string
  note: string
  timestamp: string
}

export interface Concern {
  id: string
  concern_number: string
  title: string
  description: string
  category: ConcernCategory
  sub_category?: string
  department: string
  status: ConcernStatus
  is_anonymous: boolean
  student_id: string
  student_name: string
  student_number: string
  program: string
  email: string
  file_url?: string
  routed_to: string
  submitted_at: string
  updated_at: string
  audit_trail?: AuditEntry[]
}

const departmentRouting: Record<ConcernCategory, string> = {
  Academic: 'Registrar',
  Financial: 'Accounting Office',
  Welfare: 'Student Affairs Office'
}

const generateConcernNumber = () => {
  const year = new Date().getFullYear()
  const random = Math.floor(100 + Math.random() * 900)
  return `CON-${year}-${random}`
}

export function useConcerns() {
  const [concerns, setConcerns] = useState<Concern[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * fetchConcerns()
   * This function communicates with the Supabase database and retrieves all concern records
   * from the concerns table. It sorts the results from newest to oldest (by submitted_at date),
   * stores the fetched concerns in the local state (concerns), and returns the complete list.
   * This is typically used to populate admin/staff dashboards with all submitted concerns.
   */
  const fetchConcerns = async (): Promise<Concern[]> => {
    setLoading(true)
    setError(null)
    try {
      // Query the Supabase concerns table and retrieve all columns
      const { data, error } = await supabase
        .from('concerns')
        .select('*')
        // Sort by submission date in descending order (newest first)
        .order('submitted_at', { ascending: false })
      if (error) throw error
      const result = data || []
      // Save the fetched concerns to local state for access by components
      setConcerns(result)
      return result
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch concerns';
      setError(msg)
      return []
    } finally {
      setLoading(false)
    }
  }

  /**
   * fetchMyConcerns(email)
   * This function retrieves only the concern records that belong to the currently logged-in student.
   * It queries the concerns table in Supabase but filters results to only show rows where the
   * email column matches the student's email address. Results are sorted from newest to oldest.
   * This is used in the student dashboard to show their personal concern history.
   */
  const fetchMyConcerns = async (email: string): Promise<Concern[]> => {
    setLoading(true)
    setError(null)
    try {
      // Query the concerns table and filter by the student's email
      const { data, error } = await supabase
        .from('concerns')
        .select('*')
        // .eq() filters to only rows where email matches the current student
        .eq('email', email)
        // Sort by submission date in descending order (newest first)
        .order('submitted_at', { ascending: false })
      if (error) throw error
      return data || []
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch your concerns';
      setError(msg)
      return []
    } finally {
      setLoading(false)
    }
  }

  /**
   * fetchConcernById(concernNumber)
   * This function retrieves a single, specific concern record using its unique reference code
   * (e.g., CON-2024-123). It queries the concerns table in Supabase and uses a JOIN to also
   * fetch all associated audit_trail records that belong to that concern. This provides a
   * complete view of the concern and its entire history of status changes and notes.
   */
  const fetchConcernById = async (concernNumber: string): Promise<Concern | null> => {
    // Query for one concern and ALSO fetch its related audit trail entries
    const { data, error } = await supabase
      .from('concerns')
      .select('*, audit_trail(*)')  // The asterisk notation joins the audit_trail table
      .eq('concern_number', concernNumber)
      // .single() ensures we return only one result (or null if not found)
      .single()
    if (error) return null
    return data
  }

  /**
   * submitConcern(formData)
   * This is the main function for creating and submitting a new concern. It performs 4 critical steps:
   *
   * STEP 1: Create a unique concern number
   *   - Generates a reference code like CON-2024-123 using the current year and a random number
   *   - This allows concerns to be easily tracked and referenced by students and staff
   *
   * STEP 2: Determine which department should handle the concern
   *   - Based on the category (Academic, Financial, Welfare) and sub-category chosen by the student,
   *   - The system automatically routes the concern to the appropriate department
   *   - Examples: Medical issues go to Clinic, payment issues go to Accounting Office, etc.
   *
   * STEP 3: Save a new concern record in the Supabase database
   *   - Inserts all form data (title, description, category, etc.) into the concerns table
   *   - Sets initial status to "Submitted" and records the submission timestamp
   *   - Returns the created concern record with its database ID
   *
   * STEP 4: Create the first audit trail entry
   *   - Automatically adds a record to the audit_trail table documenting the submission
   *   - Records who submitted it, when, and which department it was routed to
   *   - This creates a permanent history of the concern's lifecycle
   */
  const submitConcern = async (formData: {
    title: string
    description: string
    category: ConcernCategory
    subCategory?: string
    isAnonymous: boolean
    studentId: string
    studentName: string
    studentNumber: string
    program: string
    email: string
    fileUrl?: string
  }): Promise<string> => {
    setLoading(true)
    setError(null)
    try {
      // STEP 1: Generate a unique concern number (e.g., CON-2024-456)
      const concernNumber = generateConcernNumber()
      
      // STEP 2: Determine the appropriate department for this concern based on routing logic
      let routedTo = departmentRouting[formData.category]
      
      // Precise routing logic based on sub-categories
      if (formData.subCategory === 'Medical / Health Issue') {
        routedTo = 'Clinic'
      } else if (
        formData.subCategory === 'Receipt / OR Issue' || 
        formData.subCategory === 'Payment Not Credited'
      ) {
        routedTo = 'Accounting Office'
      } else if (
        formData.subCategory === 'Enrollment Issue' ||
        formData.subCategory === 'TOR / Records Request'
      ) {
        // These can potentially go to Admission Office if they handle initial entry,
        // but Registrar is usually safer. Let's stick with Registrar as per challenge.
        routedTo = 'Registrar'
      }

      const now = new Date().toISOString()

      // STEP 3: Insert the new concern record into the concerns table
      const { data: concern, error: concernError } = await supabase
        .from('concerns')
        .insert({
          concern_number: concernNumber,
          title: formData.title,
          description: formData.description,
          category: formData.category,
          sub_category: formData.subCategory || null,
          department: routedTo,
          status: 'Submitted',
          is_anonymous: formData.isAnonymous,
          student_id: formData.studentId,
          student_name: formData.isAnonymous ? 'Anonymous' : formData.studentName,
          student_number: formData.studentNumber,
          program: formData.program,
          email: formData.email,
          file_url: formData.fileUrl || null,
          routed_to: routedTo,
          submitted_at: now,
          updated_at: now
        })
        .select()
        .single()

      if (concernError) throw concernError

      // STEP 4: Insert the first audit trail entry documenting the submission
      await supabase.from('audit_trail').insert({
        concern_id: concern.id,
        action: 'Concern submitted',
        actor: formData.isAnonymous ? 'Anonymous' : formData.studentName,
        note: `Auto-routed to ${routedTo} based on category: ${formData.category}`,
        timestamp: now
      })

      return concernNumber
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  /**
   * updateConcernStatus(concernId, newStatus, actor, note)
   * This function updates the status of an existing concern. It performs two operations:
   *
   * 1. Updates the status column in the concerns table for the specific concern
   *    - Changes the concern's current status to the new status value
   *    - Updates the timestamp to reflect when the change was made
   *
   * 2. Creates a new audit trail entry that records:
   *    - Who made the status change (the actor - usually a staff member)
   *    - What action was taken (status update to new status)
   *    - When the change was made (timestamp)
   *    - An optional note with additional context about the change
   *
   * This creates a complete historical record of all status transitions and who made them.
   */
  const updateConcernStatus = async (
    concernId: string,
    newStatus: ConcernStatus,
    actor: string,
    note?: string
  ) => {
    setLoading(true)
    try {
      const now = new Date().toISOString()

      // Update the status column in the concerns table
      const { error: updateError } = await supabase
        .from('concerns')
        .update({ status: newStatus, updated_at: now })
        .eq('id', concernId)

      if (updateError) throw updateError

      // Record this status change in the audit trail for historical tracking
      await supabase.from('audit_trail').insert({
        concern_id: concernId,
        action: `Status updated to ${newStatus}`,
        actor,
        note: note || '',
        timestamp: now
      })

      // Refresh the concerns list to reflect the status update
      await fetchConcerns()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update concern status';
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }

  /**
   * addAuditNote(concernId, actor, note)
   * This function adds a new note/comment to the audit trail of a concern without changing its status.
   * It's used by staff members to add internal notes, observations, or updates about a concern
   * without officially transitioning it to a new status.
   *
   * The note is recorded in the audit_trail table with:
   *    - The staff member who wrote it (actor)
   *    - The content of the note (note)
   *    - The timestamp of when it was added
   *    - The action is marked as "Note added" to distinguish it from status updates
   */
  const addAuditNote = async (
    concernId: string,
    actor: string,
    note: string
  ) => {
    // Insert a new audit trail record without changing the concern's status
    const { error } = await supabase.from('audit_trail').insert({
      concern_id: concernId,
      action: 'Note added',
      actor,
      note,
      timestamp: new Date().toISOString()
    })
    if (error) throw error
  }

  /**
   * uploadFile(file)
   * This function uploads a file (image, PDF, or DOCX) to the Supabase storage bucket.
   * It generates a unique filename using the current timestamp to prevent overwriting.
   * After a successful upload, it returns the public URL of the file which is then
   * saved in the concerns table.
   */
  const uploadFile = async (file: File): Promise<string> => {
    setLoading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
      const filePath = `attachments/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('concern-attachments')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('concern-attachments')
        .getPublicUrl(filePath)

      return data.publicUrl
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    concerns, loading, error,
    fetchConcerns, fetchMyConcerns, fetchConcernById,
    submitConcern, updateConcernStatus, addAuditNote, uploadFile
  }
}
