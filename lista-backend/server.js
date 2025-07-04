// --- IMPORTAÇÕES ---
const express = require('express');
const cors = require('cors');
const db = require('./database.js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// --- CONFIGURAÇÃO DO APP ---
const app = express();
const PORT = 3000;
const JWT_SECRET = 'seu_segredo_super_secreto_e_longo'; // Lembre-se de trocar por uma string aleatória e segura

// --- MIDDLEWARE ---
// Habilita o CORS para permitir requisições do frontend
app.use(cors());
// Habilita o Express para entender JSON no corpo das requisições
app.use(express.json());


// ===================================================
// --- ROTAS PÚBLICAS (NÃO PRECISAM DE LOGIN) ---
// ===================================================

// Rota para CADASTRAR um novo usuário
app.post('/api/usuarios', async (req, res) => {
    try {
        const { nome, email, senha } = req.body;
        if (!nome || !email || !senha) {
            return res.status(400).json({ mensagem: 'Nome, email e senha são obrigatórios' });
        }

        const hashSenha = await bcrypt.hash(senha, 10); // Criptografa a senha

        const sql = 'INSERT INTO usuarios (nome, email, senha) VALUES (?,?,?)';
        db.run(sql, [nome, email, hashSenha], function(err) {
            if (err) {
                // Trata o caso de email já existente
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(409).json({ mensagem: 'Este email já está em uso.' });
                }
                return res.status(500).json({ mensagem: 'Erro ao cadastrar usuário', erro: err.message });
            }
            res.status(201).json({ mensagem: 'Usuário cadastrado com sucesso!', id: this.lastID });
        });
    } catch (error) {
        res.status(500).json({ mensagem: 'Erro no servidor', erro: error.message });
    }
});

// Rota para LOGAR um usuário
app.post('/api/login', (req, res) => {
    const { email, senha } = req.body;
    if (!email || !senha) {
        return res.status(400).json({ mensagem: 'Email e senha são obrigatórios' });
    }

    const sql = 'SELECT * FROM usuarios WHERE email = ?';
    db.get(sql, [email], async (err, usuario) => {
        if (err) {
            return res.status(500).json({ mensagem: 'Erro no servidor', erro: err.message });
        }
        if (!usuario) {
            return res.status(401).json({ mensagem: 'Email ou senha inválidos' });
        }

        const senhaValida = await bcrypt.compare(senha, usuario.senha);
        if (!senhaValida) {
            return res.status(401).json({ mensagem: 'Email ou senha inválidos' });
        }

        // Se a senha é válida, cria um token JWT
        const token = jwt.sign({ id: usuario.id, email: usuario.email }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ mensagem: 'Login bem-sucedido!', token: token });
    });
});


// ===================================================
// --- MIDDLEWARE DE AUTENTICAÇÃO ---
// ===================================================
function autenticarToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Formato "Bearer TOKEN"

    if (!token) {
        return res.sendStatus(401); // Não autorizado, pois não há token
    }

    jwt.verify(token, JWT_SECRET, (err, usuario) => {
        if (err) {
            return res.sendStatus(403); // Token inválido ou expirado
        }
        req.usuario = usuario; // Adiciona os dados do usuário (payload do token) na requisição
        next(); // Passa para a execução da rota protegida
    });
}


// ===================================================
// --- ROTAS PRIVADAS (PRECISAM DE LOGIN) ---
// ===================================================

// --- ROTAS DE LISTAS ---

// Rota para OBTER todas as listas do usuário logado
app.get('/api/listas', autenticarToken, (req, res) => {
    const sql = 'SELECT * FROM listas WHERE usuario_id = ?';
    db.all(sql, [req.usuario.id], (err, listas) => {
        if (err) {
            return res.status(500).json({ mensagem: 'Erro ao buscar listas', erro: err.message });
        }
        res.json(listas);
    });
});

// Rota para CRIAR uma nova lista
app.post('/api/listas', autenticarToken, (req, res) => {
    const { nome_lista } = req.body;
    if (!nome_lista) {
        return res.status(400).json({ mensagem: 'O nome da lista é obrigatório' });
    }

    const sql = 'INSERT INTO listas (nome_lista, usuario_id) VALUES (?, ?)';
    db.run(sql, [nome_lista, req.usuario.id], function(err) {
        if (err) {
            return res.status(500).json({ mensagem: 'Erro ao criar lista', erro: err.message });
        }
        res.status(201).json({ mensagem: 'Lista criada!', id: this.lastID });
    });
});

// Rota para DELETAR uma lista
app.delete('/api/listas/:id', autenticarToken, (req, res) => {
    const listaId = req.params.id;
    const sql = 'DELETE FROM listas WHERE id = ? AND usuario_id = ?';
    db.run(sql, [listaId, req.usuario.id], function(err) {
        if (err) {
            return res.status(500).json({ mensagem: 'Erro ao deletar lista', erro: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ mensagem: 'Lista não encontrada ou não pertence ao usuário' });
        }
        res.json({ mensagem: 'Lista deletada com sucesso!' });
    });
});


// --- ROTAS DE ITENS ---

// Rota para OBTER todos os itens de uma lista específica
app.get('/api/listas/:id/itens', autenticarToken, (req, res) => {
    const listaId = req.params.id;
    const sql = 'SELECT * FROM itens WHERE lista_id = ?';
    db.all(sql, [listaId], (err, itens) => {
        if (err) {
            return res.status(500).json({ mensagem: 'Erro ao buscar itens', erro: err.message });
        }
        res.json(itens);
    });
});

// Rota para ADICIONAR um item a uma lista (com detalhes)
app.post('/api/listas/:id/itens', autenticarToken, (req, res) => {
    const listaId = req.params.id;
    const { nome_item, quantidade, preco, categoria } = req.body;
    if(!nome_item){
        return res.status(400).json({ mensagem: 'O nome do item é obrigatório' });
    }

    const sql = 'INSERT INTO itens (nome_item, quantidade, preco, categoria, lista_id) VALUES (?, ?, ?, ?, ?)';
    db.run(sql, [nome_item, quantidade || '1', preco || 0, categoria || 'Outros', listaId], function(err) {
        if (err) {
            return res.status(500).json({ mensagem: 'Erro ao adicionar item', erro: err.message });
        }
        res.status(201).json({ mensagem: 'Item adicionado!', id: this.lastID });
    });
});

// Rota para MARCAR/EDITAR um item
app.patch('/api/itens/:id', autenticarToken, (req, res) => {
    const itemId = req.params.id;
    const { nome_item, quantidade, preco, categoria, comprado } = req.body;

    const fields = [];
    const params = [];
    if (nome_item !== undefined) { fields.push('nome_item = ?'); params.push(nome_item); }
    if (quantidade !== undefined) { fields.push('quantidade = ?'); params.push(quantidade); }
    if (preco !== undefined) { fields.push('preco = ?'); params.push(preco); }
    if (categoria !== undefined) { fields.push('categoria = ?'); params.push(categoria); }
    if (comprado !== undefined) { fields.push('comprado = ?'); params.push(comprado); }

    if (fields.length === 0) {
        return res.status(400).json({ mensagem: 'Nenhum campo para atualizar foi fornecido' });
    }

    params.push(itemId);
    const sql = `UPDATE itens SET ${fields.join(', ')} WHERE id = ?`;

    db.run(sql, params, function(err) {
        if (err) {
            return res.status(500).json({ mensagem: 'Erro ao atualizar item', erro: err.message });
        }
        res.json({ mensagem: 'Item atualizado com sucesso!' });
    });
});

// Rota para DELETAR um item
app.delete('/api/itens/:id', autenticarToken, (req, res) => {
    const itemId = req.params.id;
    const sql = 'DELETE FROM itens WHERE id = ?';
    db.run(sql, [itemId], function(err) {
        if (err) {
            return res.status(500).json({ mensagem: 'Erro ao deletar item', erro: err.message });
        }
        res.json({ mensagem: 'Item deletado com sucesso!' });
    });
});


// --- INICIALIZAÇÃO DO SERVIDOR ---
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta http://localhost:${PORT}`);
});