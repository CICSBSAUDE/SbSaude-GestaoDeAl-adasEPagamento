const fs = require('fs');
let code = fs.readFileSync('src/context/AuthContext.tsx', 'utf8');

const imports = `import { auth, googleProvider } from '../lib/firebase';\nimport { signInWithPopup } from 'firebase/auth';\n`;
if (!code.includes('googleProvider')) {
  code = imports + code;
}

const interfaceAdd = `  loginWithGoogle: () => Promise<void>;\n`;
code = code.replace(/login: \(email: string\) => Promise<void>;/, 'login: (email: string) => Promise<void>;\n' + interfaceAdd);

const implAdd = `
  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const userEmail = result.user.email;
      if (!userEmail) throw new Error('E-mail não fornecido pelo Google.');
      
      // Auto-register logic or just login if exists
      // Wait, let's call the backend to register if needed.
      const usersRes = await api.getUsers();
      const existingUser = usersRes.users.find(u => u.email.toLowerCase() === userEmail.toLowerCase());
      
      if (existingUser) {
        await login(userEmail);
      } else {
        // Create new user with default role
        const newUser = {
          name: result.user.displayName || 'Usuário Google',
          email: userEmail,
          cargo: 'Usuário Externo',
          area: 'Geral',
          centroCusto: 'N/A',
          phone: result.user.phoneNumber || '',
          roles: ['SOLICITANTE'],
          status: 'ATIVO',
          authType: 'GOOGLE',
          isEmailVerified: result.user.emailVerified
        };
        const createRes = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newUser)
        }).then(r => r.json());
        
        await refreshUserData();
        await login(userEmail);
      }
    } catch (e: any) {
      console.error(e);
      throw new Error(e.message || 'Erro ao autenticar com Google');
    }
  };
`;
code = code.replace(/const login = async /g, implAdd + '\n  const login = async ');

code = code.replace(/logout,\s*refreshUserData,/g, 'logout,\n        refreshUserData,\n        loginWithGoogle,');

fs.writeFileSync('src/context/AuthContext.tsx', code);
