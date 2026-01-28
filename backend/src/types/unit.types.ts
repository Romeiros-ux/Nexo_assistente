/**
 * Tipos e Interfaces relacionados a Unidades Educacionais
 */

/**
 * Tipos de unidades educacionais
 */
export enum UnitType {
  SCHOOL = 'school',
  CENTER = 'center',
  DEPARTMENT = 'department',
}

/**
 * Status da unidade educacional
 */
export enum UnitStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

/**
 * Interface da Unidade Educacional
 */
export interface EducationalUnit {
  id: string;
  name: string;
  type: UnitType;
  code?: string;
  address?: string;
  phone?: string;
  status: UnitStatus;
  created_at: Date;
  updated_at: Date;
}

/**
 * Interface do relacionamento Usuário x Unidade
 */
export interface UserUnit {
  id: string;
  user_id: string;
  unit_id: string;
  created_at: Date;
}

/**
 * DTO para criar unidade educacional
 */
export interface CreateEducationalUnitDTO {
  name: string;
  type: UnitType;
  code?: string;
  address?: string;
  phone?: string;
  status?: UnitStatus;
}

/**
 * DTO para atualizar unidade educacional
 */
export interface UpdateEducationalUnitDTO {
  name?: string;
  type?: UnitType;
  code?: string;
  address?: string;
  phone?: string;
  status?: UnitStatus;
}

/**
 * DTO para vincular usuário a unidades
 */
export interface LinkUserUnitsDTO {
  unit_ids: string[];
}

/**
 * Unidade com informações extras
 */
export interface EducationalUnitWithStats extends EducationalUnit {
  user_count?: number;
}

/**
 * Usuário com suas unidades
 */
export interface UserWithUnits {
  id: string;
  name: string;
  email: string;
  role: string;
  units: EducationalUnit[];
}
