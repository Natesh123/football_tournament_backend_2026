import { AppDataSource } from "../../config/data-source";
import { Not } from "typeorm";
import { UserRole } from "../../entities/role.entity";
import { User } from "../../entities/user.entity";
import { Permission } from "../../entities/permission.entity";
// @ts-ignore
import * as bcrypt from "bcrypt";

export async function createRole(name: string) {
    const roleRepository = AppDataSource.getRepository(UserRole);
    const existingRole = await roleRepository.findOne({ where: { name } });
    if (existingRole) {
        throw new Error("Role already exists");
    }
    const role = roleRepository.create({ name });
    return await roleRepository.save(role);
}

export async function getAllRoles() {
    const roleRepository = AppDataSource.getRepository(UserRole);
    // @ts-ignore
    return await roleRepository.find({ where: { id: Not(1) } });
}

export async function getAllUsers() {
    const userRepository = AppDataSource.getRepository(User);
    return await userRepository.find({ relations: ["userRole"] });
}

export async function upsertUser(userData: any) {
    const userRepository = AppDataSource.getRepository(User);
    const { id, email, user_name, phone_number, roleId, state } = userData;

    let user;
    if (id) {
        user = await userRepository.findOne({ where: { id } });
    }

    if (user) {
        // Update
        user.email = email || user.email;
        user.user_name = user_name || user.user_name;
        user.phone_number = phone_number || user.phone_number;
        if (roleId) {
            user.roleId = roleId;
            user.userRole = { id: roleId } as any;
        }
        user.state = state !== undefined ? state : user.state;
    } else {
        // Create - Generate random password
        const plainPassword = Math.random().toString(36).slice(-10);
        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        user = userRepository.create({
            email,
            user_name,
            phone_number,
            password: hashedPassword,
            roleId,
            state: state !== undefined ? state : 1,
            is_verified: true
        });

        const savedUser = await userRepository.save(user);

        // Send email with the plain password
        const { sendPasswordEmail } = require("../../utils/email.util");
        sendPasswordEmail(email, plainPassword).catch((err: any) => {
            console.error("Failed to send welcome email:", err);
        });

        return savedUser;
    }

    return await userRepository.save(user);
}

export async function deleteUser(id: number) {
    const userRepository = AppDataSource.getRepository(User);
    const result = await userRepository.delete(id);
    if (result.affected === 0) {
        throw new Error("User not found");
    }
    return { message: "User deleted successfully" };
}

export async function changePassword(userId: number, oldPass: string, newPass: string) {
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    const match = await bcrypt.compare(oldPass, user.password);
    if (!match) throw new Error("Current password is incorrect");

    user.password = await bcrypt.hash(newPass, 10);
    return await userRepository.save(user);
}

export async function savePermissions(data: any) {
    const permissionRepository = AppDataSource.getRepository(Permission);
    const { roleId, permissions } = data;

    let permission = await permissionRepository.findOne({ where: { roleId } });

    if (!permission) {
        permission = permissionRepository.create({ roleId });
    }

    permission.module_access = permissions;

    return await permissionRepository.save(permission);
}

export async function getPermissions() {
    const permissionRepository = AppDataSource.getRepository(Permission);
    return await permissionRepository.find({
        relations: ["role"]
    });
}

export async function deletePermission(id: number) {
    const permissionRepository = AppDataSource.getRepository(Permission);
    return await permissionRepository.delete(id);
}
