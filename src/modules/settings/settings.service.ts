import { AppDataSource } from "../../config/data-source";
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
    return await roleRepository.find();
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
        user.roleId = roleId || user.roleId;
        user.state = state !== undefined ? state : user.state;
    } else {
        // Create
        user = userRepository.create({
            email,
            user_name,
            phone_number,
            password: 'defaultPassword123!', // Required by entity, but not managed here anymore.
            roleId,
            state: state !== undefined ? state : 1,
            is_verified: true
        });
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
