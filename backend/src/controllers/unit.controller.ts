/**
 * Educational Unit Controller
 * 
 * Controlador de unidades educacionais.
 * Gerencia requisições HTTP relacionadas a unidades e vínculos.
 */

import { Request, Response } from 'express';
import { EducationalUnitService } from '../services/unit.service';
import { CreateEducationalUnitDTO, UpdateEducationalUnitDTO, LinkUserUnitsDTO } from '../types/unit.types';
import { ApiError } from '../middlewares/errorHandler';

export class EducationalUnitController {
  private unitService: EducationalUnitService;

  constructor() {
    this.unitService = new EducationalUnitService();
  }

  /**
   * GET /educational-units
   * Lista unidades baseado no perfil do usuário
   * TI vê todas, demais apenas suas unidades
   * Requer: authGuard
   */
  getAll = async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError('Usuário não autenticado', 401);
    }

    const units = await this.unitService.getUnitsForUser(
      req.user.id,
      req.user.role
    );

    res.status(200).json({
      success: true,
      data: units,
      total: units.length,
      user_role: req.user.role,
      access_note: req.user.role === 'TI' 
        ? 'Administrador - visualizando todas as unidades'
        : 'Visualizando apenas unidades vinculadas ao seu usuário',
    });
  };

  /**
   * GET /educational-units/:id
   * Busca unidade por ID
   * Verifica se usuário tem acesso
   * Requer: authGuard
   */
  getById = async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError('Usuário não autenticado', 401);
    }

    const { id } = req.params;

    const unit = await this.unitService.getUnitById(
      id,
      req.user.id,
      req.user.role
    );

    res.status(200).json({
      success: true,
      data: unit,
    });
  };

  /**
   * POST /educational-units
   * Cria nova unidade
   * Requer: authGuard, adminGuard
   */
  create = async (req: Request, res: Response) => {
    const unitData = req.body as CreateEducationalUnitDTO;

    const unit = await this.unitService.createUnit(unitData);

    res.status(201).json({
      success: true,
      message: 'Unidade educacional criada com sucesso',
      data: unit,
    });
  };

  /**
   * PUT /educational-units/:id
   * Atualiza unidade
   * Requer: authGuard, adminGuard
   */
  update = async (req: Request, res: Response) => {
    const { id } = req.params;
    const unitData = req.body as UpdateEducationalUnitDTO;

    const unit = await this.unitService.updateUnit(id, unitData);

    res.status(200).json({
      success: true,
      message: 'Unidade educacional atualizada com sucesso',
      data: unit,
    });
  };

  /**
   * DELETE /educational-units/:id
   * Deleta unidade
   * Requer: authGuard, adminGuard
   */
  delete = async (req: Request, res: Response) => {
    const { id } = req.params;

    await this.unitService.deleteUnit(id);

    res.status(200).json({
      success: true,
      message: 'Unidade educacional deletada com sucesso',
    });
  };

  /**
   * GET /users/:id/units
   * Lista unidades de um usuário
   * TI pode ver de qualquer usuário
   * Outros apenas suas próprias
   * Requer: authGuard
   */
  getUserUnits = async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError('Usuário não autenticado', 401);
    }

    const { id } = req.params;

    const units = await this.unitService.getUserUnits(
      id,
      req.user.id,
      req.user.role
    );

    res.status(200).json({
      success: true,
      data: units,
      total: units.length,
    });
  };

  /**
   * POST /users/:id/units
   * Vincula usuário a unidades
   * Requer: authGuard, adminGuard
   */
  linkUserToUnits = async (req: Request, res: Response) => {
    const { id } = req.params;
    const linkData = req.body as LinkUserUnitsDTO;

    const units = await this.unitService.linkUserToUnits(id, linkData);

    res.status(200).json({
      success: true,
      message: 'Unidades vinculadas ao usuário com sucesso',
      data: units,
      total: units.length,
    });
  };

  /**
   * GET /educational-units/filter/for-user
   * Retorna informações de filtro para o usuário atual
   * Útil para o assistente de IA
   * Requer: authGuard
   */
  getFilterForUser = async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError('Usuário não autenticado', 401);
    }

    const filter = await this.unitService.getUnitFilterForUser(
      req.user.id,
      req.user.role
    );

    res.status(200).json({
      success: true,
      data: filter,
      message: 'Informações de filtro para uso pelo assistente de IA',
    });
  };
}
