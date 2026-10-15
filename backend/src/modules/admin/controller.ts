import { Request, Response } from 'express';
import { OrderStatus, Prisma } from '@prisma/client';
import * as service from './service';

const id = (req: Request) => String(req.params.id || '');
const page = (req: Request) => Math.max(1, Number(req.query.page || 1));
const limit = (req: Request) => Math.min(100, Math.max(1, Number(req.query.limit || 20)));

export async function analytics(req: Request, res: Response) { res.json({ success: true, data: await service.analytics(req.query.from ? new Date(String(req.query.from)) : undefined, req.query.to ? new Date(String(req.query.to)) : undefined) }); }
export async function customers(req: Request, res: Response) { res.json({ success: true, data: await service.listCustomers(page(req), limit(req), String(req.query.search || '')) }); }
export async function orders(req: Request, res: Response) { res.json({ success: true, data: await service.listOrders(page(req), limit(req), req.query.status ? String(req.query.status) as OrderStatus : undefined) }); }
export async function coupons(_req: Request, res: Response) { res.json({ success: true, data: await service.listCoupons() }); }
export async function createCoupon(req: Request, res: Response) { res.status(201).json({ success: true, data: await service.createCoupon(req.body as Prisma.CouponCreateInput) }); }
export async function updateCoupon(req: Request, res: Response) { res.json({ success: true, data: await service.updateCoupon(id(req), req.body as Prisma.CouponUpdateInput) }); }
export async function deleteCoupon(req: Request, res: Response) { res.json({ success: true, data: await service.deleteCoupon(id(req)) }); }
export async function banners(_req: Request, res: Response) { res.json({ success: true, data: await service.listBanners() }); }
export async function createBanner(req: Request, res: Response) { res.status(201).json({ success: true, data: await service.createBanner(req.body as Prisma.BannerCreateInput) }); }
export async function updateBanner(req: Request, res: Response) { res.json({ success: true, data: await service.updateBanner(id(req), req.body as Prisma.BannerUpdateInput) }); }
export async function deleteBanner(req: Request, res: Response) { res.json({ success: true, data: await service.deleteBanner(id(req)) }); }
export async function report(req: Request, res: Response) {
  const result = await service.report((String(req.query.type || 'orders') as 'orders' | 'customers' | 'products'));
  const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const csv = [result.headers, ...result.rows.map((row) => result.headers.map((header) => escape((row as Record<string, unknown>)[header])))] .map((row) => row.join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv'); res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`); res.send(csv);
}
