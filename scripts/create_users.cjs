const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://bwitfpvqruwikpuaiurc.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3aXRmcHZxcnV3aWtwdWFpdXJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1Mzk5NTcsImV4cCI6MjA4ODExNTk1N30.amILaES0Z7yRkEL6_-kkeLUKb-SaxBQ5uTF-pjW-T4E';

const supabase = createClient(supabaseUrl, supabaseKey);

const usersToCreate = [
    { email: 'gustavo@autodark.com', password: 'AutoDark@2026', fullName: 'Gustavo Petinarti' },
    { email: 'guilherme@autodark.com', password: 'AutoDark@2026', fullName: 'Guilherme Petinarti' },
    { email: 'dev@autodark.com', password: 'DevTeam@2026', fullName: 'Dev Team' },
];

async function main() {
    for (const user of usersToCreate) {
        const { data, error } = await supabase.auth.signUp({
            email: user.email,
            password: user.password,
            options: {
                data: {
                    full_name: user.fullName
                }
            }
        });

        if (error) {
            console.error(`Error creating ${user.email}:`, error.message);
        } else {
            console.log(`Created ${user.email}`, data.user?.id);
        }
    }
}

main().catch(console.error);
