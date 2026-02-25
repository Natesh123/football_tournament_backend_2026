import { Request, Response } from "express";
import * as settingsService from "./settings.service";

export async function addRole(req: Request, res: Response) {
    try {
        const { name } = req.body;
        const result = await settingsService.createRole(name);
        res.status(201).json(result);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
}

export async function getRoles(req: Request, res: Response) {
    try {
        const roles = await settingsService.getAllRoles();
        res.json(roles);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
}

export async function getUsers(req: Request, res: Response) {
    try {
        const users = await settingsService.getAllUsers();
        res.json(users);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
}

export async function saveUser(req: Request, res: Response) {
    try {
        const result = await settingsService.upsertUser(req.body);
        res.json(result);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
}

export async function deleteUser(req: Request, res: Response) {
    try {
        const id = parseInt(req.params.id as string);
        const result = await settingsService.deleteUser(id);
        res.json(result);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
}

export async function savePermissions(req: Request, res: Response) {
    try {
        const result = await settingsService.savePermissions(req.body);
        res.json(result);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
}

export async function getPermissions(req: Request, res: Response) {
    try {
        const result = await settingsService.getPermissions();
        res.json(result);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
}

export async function deletePermission(req: Request, res: Response) {
    try {
        const id = parseInt(req.params.id as string);
        const result = await settingsService.deletePermission(id);
        res.json(result);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
}
