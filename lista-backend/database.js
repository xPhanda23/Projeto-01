// 1. Importa a biblioteca sqlite3
const sqlite3 = require('sqlite3').verbose(); // .verbose() nos dá mais informações no caso de erros

// 2. Define o nome do arquivo do nosso banco de dados
const DB_SOURCE = 'db.sqlite';

// 3. Conecta-se ao banco de dados (ou o cria se não existir)
const db = new sqlite3.Database(DB_SOURCE, (err) => {
  if (err) {
    // Não foi possível conectar ao banco de dados
    console.error(err.message);
    throw err;
  } else {
    console.log('Conectado ao banco de dados SQLite.');
    // 4. Cria as tabelas que vamos usar (se elas não existirem)
    // Usamos `db.run` para executar comandos SQL que não retornam dados
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT,
            email TEXT UNIQUE,
            senha TEXT
        )`, (err) => {
      if (err) {
        // A tabela já existia ou houve um erro
      } else {
        console.log('Tabela "usuarios" criada.');
      }
    });

    db.run(`CREATE TABLE IF NOT EXISTS listas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome_lista TEXT,
            usuario_id INTEGER,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        )`, (err) => {
      if (err) {
        // A tabela já existia ou houve um erro
      } else {
        console.log('Tabela "listas" criada.');
      }
    });

    db.run(`CREATE TABLE IF NOT EXISTS itens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome_item TEXT,
            comprado INTEGER DEFAULT 0,
            lista_id INTEGER,
            FOREIGN KEY (lista_id) REFERENCES listas(id)
        )`, (err) => {
      if (err) {
        // A tabela já existia ou houve um erro
      } else {
        console.log('Tabela "itens" criada.');
      }
    });
  }
});

// 5. Exporta a conexão do banco de dados para que possamos usá-la em outros arquivos
module.exports = db;