const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bwitfpvqruwikpuaiurc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3aXRmcHZxcnV3aWtwdWFpdXJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1Mzk5NTcsImV4cCI6MjA4ODExNTk1N30.amILaES0Z7yRkEL6_-kkeLUKb-SaxBQ5uTF-pjW-T4E';

const supabase = createClient(supabaseUrl, supabaseKey);

async function signUp() {
    const { data, error } = await supabase.auth.signUp({
        email: 'sf.prod.sf3@gmail.com',
        password: 'guijoni45',
    });
    if (error) {
        console.error('Erro ao criar usuário:', error.message);
    } else {
        console.log('Usuário criado com sucesso:', data.user?.id);
    }
}

signUp();
