// Adiciona o dotenv para ler o arquivo .env localmente
require('dotenv').config();

// --- IMPORTAÇÕES ---
const express = require('express');
const cors = require('cors');
const db = require('./database.js'); // Agora aponta para o nosso database.js do PostgreSQL
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// --- CONFIGURAÇÃO DO APP ---
const app = express();
const PORT = process.env.PORT || 3000; // Render usa a variável de ambiente PORT
const JWT_SECRET = process.env.JWT_SECRET || 'seu_segredo_super_secreto_e_longo';

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// ===================================================
// --- ROTAS PÚBLICAS (CADASTRO E LOGIN) ---
// ===================================================

// Rota para CADASTRAR um novo usuário
app.post('/api/usuarios', async (req, res) => {
    try {
        const { nome, email, senha } = req.body;
        if (!nome || !email || !senha) {
            return res.status(400).json({ mensagem: 'Nome, email e senha são obrigatórios' });
        }
        const hashSenha = await bcrypt.hash(senha, 10);
        
        // SINTAXE NOVA com db.query e placeholders $1, $2, etc.
        const sql = 'INSERT INTO usuarios (nome, email, senha) VALUES ($1, $2, $3) RETURNING id';
        const { rows } = await db.query(sql, [nome, email, hashSenha]);
        
        res.status(201).json({ mensagem: 'Usuário cadastrado com sucesso!', id: rows[0].id });
    } catch (error) {
        if (error.code === '23505') { // Código de erro do Postgres para violação de constraint UNIQUE
            return res.status(409).json({ mensagem: 'Este email já está em uso.' });
        }
        res.status(500).json({ mensagem: 'Erro no servidor ao cadastrar', erro: error.message });
    }
});

// Rota para LOGAR um usuário
app.post('/api/login', async (req, res) => {
    try {
        const { email, senha } = req.body;
        if (!email || !senha) {
            return res.status(400).json({ mensagem: 'Email e senha são obrigatórios' });
        }

        const sql = 'SELECT * FROM usuarios WHERE email = $1';
        const { rows } = await db.query(sql, [email]);
        const usuario = rows[0];

        if (!usuario) {
            return res.status(401).json({ mensagem: 'Email ou senha inválidos' });
        }

        const senhaValida = await bcrypt.compare(senha, usuario.senha);
        if (!senhaValida) {
            return res.status(401).json({ mensagem: 'Email ou senha inválidos' });
        }

        const token = jwt.sign({ id: usuario.id, email: usuario.email }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ mensagem: 'Login bem-sucedido!', token: token });
    } catch (error) {
        res.status(500).json({ mensagem: 'Erro no servidor ao logar', erro: error.message });
    }
});

// --- MIDDLEWARE DE AUTENTICAÇÃO (sem mudanças) ---
function autenticarToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, usuario) => {
        if (err) return res.sendStatus(403);
        req.usuario = usuario;
        next();
    });
}

// ===================================================
// --- ROTAS PRIVADAS (PRECISAM DE LOGIN) ---
// ===================================================

// Rota para OBTER todas as listas do usuário logado
app.get('/api/listas', autenticarToken, async (req, res) => {
    const sql = 'SELECT * FROM listas WHERE usuario_id = $1';
    const { rows } = await db.query(sql, [req.usuario.id]);
    res.json(rows);
});

// Rota para CRIAR uma nova lista
app.post('/api/listas', autenticarToken, async (req, res) => {
    const { nome_lista } = req.body;
    const sql = 'INSERT INTO listas (nome_lista, usuario_id) VALUES ($1, $2) RETURNING id';
    const { rows } = await db.query(sql, [nome_lista, req.usuario.id]);
    res.status(201).json({ mensagem: 'Lista criada!', id: rows[0].id });
});

// Rota para DELETAR uma lista
app.delete('/api/listas/:id', autenticarToken, async (req, res) => {
    const sql = 'DELETE FROM listas WHERE id = $1 AND usuario_id = $2';
    const { rowCount } = await db.query(sql, [req.params.id, req.usuario.id]);
    if (rowCount === 0) {
        return res.status(404).json({ mensagem: 'Lista não encontrada ou não pertence ao usuário' });
    }
    res.json({ mensagem: 'Lista deletada com sucesso!' });
});

// Rota para OBTER todos os itens de uma lista
app.get('/api/listas/:id/itens', autenticarToken, async (req, res) => {
    const sql = 'SELECT * FROM itens WHERE lista_id = $1';
    const { rows } = await db.query(sql, [req.params.id]);
    res.json(rows);
});

// Rota para ADICIONAR um item a uma lista
app.post('/api/listas/:id/itens', autenticarToken, async (req, res) => {
    const { nome_item, quantidade, preco, categoria } = req.body;
    const sql = 'INSERT INTO itens (nome_item, quantidade, preco, categoria, lista_id) VALUES ($1, $2, $3, $4, $5) RETURNING id';
    const { rows } = await db.query(sql, [nome_item, quantidade, preco, categoria, req.params.id]);
    res.status(201).json({ mensagem: 'Item adicionado!', id: rows[0].id });
});

// Rota para ATUALIZAR/MARCAR um item
app.patch('/api/itens/:id', autenticarToken, async (req, res) => {
    const { comprado } = req.body;
    const sql = 'UPDATE itens SET comprado = $1 WHERE id = $2';
    await db.query(sql, [comprado, req.params.id]);
    res.json({ mensagem: 'Item atualizado com sucesso!' });
});

// Rota para DELETAR um item
app.delete('/api/itens/:id', autenticarToken, async (req, res) => {
    const sql = 'DELETE FROM itens WHERE id = $1';
    await db.query(sql, [req.params.id]);
    res.json({ mensagem: 'Item deletado com sucesso!' });
});


// --- INICIALIZAÇÃO DO SERVIDOR ---
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});