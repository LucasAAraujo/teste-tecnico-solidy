import { Request, Response, NextFunction } from 'express';
import { getDashboard } from './dashboard.service';
import {
  contractsReport,
  obrasReport,
  purchaseOrdersReport,
  contractReportSchema,
  obraReportSchema,
  poReportSchema,
} from './reports.service';

export async function dashboardHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await getDashboard(req.companyId));
  } catch (err) { next(err); }
}

export async function contractsReportHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const filters = contractReportSchema.parse(req.query);
    res.json(await contractsReport(req.companyId, filters));
  } catch (err) { next(err); }
}

export async function obrasReportHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const filters = obraReportSchema.parse(req.query);
    res.json(await obrasReport(req.companyId, filters));
  } catch (err) { next(err); }
}

export async function poReportHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const filters = poReportSchema.parse(req.query);
    res.json(await purchaseOrdersReport(req.companyId, filters));
  } catch (err) { next(err); }
}
