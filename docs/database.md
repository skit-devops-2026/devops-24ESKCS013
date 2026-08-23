# Database

This project uses PostgreSQL hosted on Supabase.

## Initial Tables
- **profiles**: User profile information linked to Supabase Auth users
- **folders**: For the notes system
- **files**: Metadata for uploaded notes
- **subjects**: Academic subjects
- **topics**: Specific topics within subjects
- **tasks**: Academic task tracking
- **study_sessions**: Tracking study time
- **goals**: Student goals
- **progress**: Exam/DSA progress tracking

## RLS (Row Level Security)
Row Level Security is strictly enforced. Students can only access rows where `user_id` matches their authenticated `auth.uid()`.
