
import { db } from "@/lib/db";

export const dynamic = 'force-dynamic';

export default async function DebugPage() {
    let userCount = 0;
    let users: any[] = [];
    let error = null;
    let dbUrl = process.env.DATABASE_URL || "NOT SAT";

    try {
        userCount = await db.users.count();
        users = await db.users.findMany({
            take: 5,
            select: { university_id: true, role_id: true, full_name: true }
        });
    } catch (e: any) {
        error = e.message;
    }

    return (
        <div className="p-8 font-mono">
            <h1 className="text-2xl font-bold mb-4">Database Debug</h1>

            <div className="mb-4 p-4 border rounded bg-gray-100 dark:bg-gray-800">
                <h2 className="font-bold">Status</h2>
                {error ? (
                    <span className="text-red-500 font-bold">ERROR</span>
                ) : (
                    <span className="text-green-500 font-bold">CONNECTED</span>
                )}
            </div>

            <div className="mb-4">
                <p><strong>DATABASE_URL First 20 chars:</strong> {dbUrl.substring(0, 20)}...</p>
                <p><strong>User Count:</strong> {userCount}</p>
            </div>

            {error && (
                <div className="bg-red-100 p-4 rounded text-red-800 mb-4">
                    <pre>{JSON.stringify(error, null, 2)}</pre>
                </div>
            )}

            {users.length > 0 && (
                <div>
                    <h2 className="font-bold mb-2">Sample Users:</h2>
                    <ul className="list-disc pl-5">
                        {users.map(u => (
                            <li key={u.university_id}>
                                {u.university_id} - {u.full_name} (Role: {u.role_id})
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
