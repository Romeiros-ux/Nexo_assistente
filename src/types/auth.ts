 export type AppRole = 'secretaria' | 'ti' | 'coordenacao' | 'diretor';
 
 export interface Unit {
   id: string;
   code: string;
   name: string;
 }
 
 export interface UserProfile {
   id: string;
   user_id: string;
   email: string | null;
   full_name: string | null;
   unit_id: string | null;
   is_active: boolean;
 }
 
 export interface UserRole {
   id: string;
   user_id: string;
   role: AppRole;
 }
 
 export interface UserContext {
   userId: string;
   email: string | null;
   fullName: string | null;
   role: AppRole | null;
   unitId: string | null;
   unitName: string | null;
   isActive: boolean;
   canUploadDocuments: boolean;
   canViewAllUnits: boolean;
   canAccessAuditLogs: boolean;
 }