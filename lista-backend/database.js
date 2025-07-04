// 1. Importa a biblioteca sqlite3. O .verbose() fornece mais informações de log em caso de erros.
const sqlite3 = require('sqlite3').verbose();

// 2. Define o nome do arquivo que será o nosso banco de dados.
const DB_SOURCE = 'db.sqlite';

// 3. Conecta-se ao arquivo do banco de dados. O SQLite criará o arquivo se ele não existir.
const db = new sqlite3.Database(DB_SOURCE, (err) => {
  // A função de callback é executada após a tentativa de conexão.
  if (err) {
    // Se houver um erro na conexão, ele será mostrado no console e a aplicação será interrompida.
    console.error(err.message);
    throw err;
  } else {
    // Se a conexão for bem-sucedida, uma mensagem é exibida.
    console.log('Conectado ao banco de dados SQLite.');

    // 4. Inicia a criação das tabelas. O db.serialize garante que os comandos sejam executados em sequência.
    db.serialize(() => {
        console.log("Iniciando a criação das tabelas, se necessário...");

        // Comando para criar a tabela 'usuarios' se ela não existir.
        db.run(`CREATE TABLE IF NOT EXISTS usuarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                senha TEXT NOT NULL
            )`, (err) => {
          if (err) {
            console.error("Erro ao criar tabela usuarios:", err.message);
          } else {
            console.log('Tabela "usuarios" verificada/criada com sucesso.');
          }
        });

        // Comando para criar a tabela 'listas' se ela não existir.
        db.run(`CREATE TABLE IF NOT EXISTS listas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome_lista TEXT NOT NULL,
                usuario_id INTEGER,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
            )`, (err) => {
            if (err) {
                console.error("Erro ao criar tabela listas:", err.message);
            } else {
                console.log('Tabela "listas" verificada/criada com sucesso.');
            }
        });

        // Comando para criar a tabela 'itens' com todas as colunas novas, se ela não existir.
        db.run(`CREATE TABLE IF NOT EXISTS itens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome_item TEXT NOT NULL,
                quantidade TEXT DEFAULT '1',
                preco REAL DEFAULT 0,
                categoria TEXT DEFAULT 'Outros',
                comprado INTEGER DEFAULT 0,
                lista_id INTEGER,
                FOREIGN KEY (lista_id) REFERENCES listas(id) ON DELETE CASCADE
            )`, (err) => {
            if (err) {
                console.error("Erro ao criar tabela itens:", err.message);
            } else {
                console.log('Tabela "itens" verificada/criada com sucesso.');
            }
        });
    });
  }
});

// 5. Exporta o objeto de conexão 'db' para que outros arquivos (como o server.js) possam interagir com o banco de dados.
module.exports = db;