import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as bcrypt from 'bcryptjs';

/**
 * POST /api/admin/promote-super-admin
 * 
 * This is a secure endpoint to promote an existing ADMIN user to SUPER_ADMIN.
 * It requires a secret key to execute (protect against unauthorized access).
 * 
 * Request body:
 * {
 *   email: string,           // Email of the user to promote
 *   currentPassword: string, // Current password for verification
 *   secretKey: string        // Must match SUPER_ADMIN_PROMOTION_KEY env variable
 * }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, currentPassword, secretKey } = body;

        // Validate required fields
        if (!email || !currentPassword || !secretKey) {
            return NextResponse.json(
                { error: 'Missing required fields: email, currentPassword, secretKey' },
                { status: 400 }
            );
        }

        // Validate secret key - use environment variable or a fallback for first-time setup
        const validSecretKey = process.env.SUPER_ADMIN_PROMOTION_KEY || 'PROMOTE_TO_SUPER_ADMIN_2024';
        if (secretKey !== validSecretKey) {
            console.warn(`[SECURITY] Invalid promotion attempt for email: ${email}`);
            return NextResponse.json(
                { error: 'Invalid secret key' },
                { status: 403 }
            );
        }

        // Find the user
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            select: {
                id: true,
                email: true,
                name: true,
                password: true,
                role: true,
            },
        });

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Verify password
        if (!user.password) {
            return NextResponse.json(
                { error: 'User has no password set' },
                { status: 400 }
            );
        }

        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
            console.warn(`[SECURITY] Invalid password in promotion attempt for: ${email}`);
            return NextResponse.json(
                { error: 'Invalid password' },
                { status: 401 }
            );
        }

        // Check if user is already SUPER_ADMIN
        if (user.role === 'SUPER_ADMIN') {
            return NextResponse.json(
                { message: 'User is already a SUPER_ADMIN', role: user.role },
                { status: 200 }
            );
        }

        // Check if user is at least an ADMIN (can't promote regular customers)
        if (user.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Only ADMIN users can be promoted to SUPER_ADMIN' },
                { status: 403 }
            );
        }

        // Promote to SUPER_ADMIN
        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: { role: 'SUPER_ADMIN' },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
            },
        });

        console.log(`[SUCCESS] User ${email} promoted to SUPER_ADMIN`);

        return NextResponse.json({
            success: true,
            message: `User ${email} has been promoted to SUPER_ADMIN`,
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                name: updatedUser.name,
                role: updatedUser.role,
            },
        });
    } catch (error) {
        console.error('Error promoting user:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
