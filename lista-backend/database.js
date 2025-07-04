// Importa o pacote 'pg' que permite a conexão com o PostgreSQL.
// Usamos a desestruturação para pegar a classe 'Pool'.
const { Pool } = require('pg');

// Cria uma nova instância do Pool.
// O Pool gerencia múltiplas conexões com o banco de dados de forma eficiente.
const pool = new Pool({
    // A configuração mais importante: ele automaticamente busca a variável de ambiente
    // DATABASE_URL que definimos no arquivo .env (para rodar localmente)
    // ou nas configurações do Render (para rodar online).
    connectionString: process.env.DATABASE_URL,
    
    // O Render exige uma conexão SSL, mas pode precisar desta configuração
    // para evitar um erro de certificado auto-assinado.
    ssl: {
        rejectUnauthorized: false
    }
});

// Exportamos um objeto com um método chamado 'query'.
// Este método será usado em nosso server.js para executar comandos SQL.
// Ele simplesmente passa o texto da query e os parâmetros para o pool.
module.exports = {
    query: (text, params) => pool.query(text, params),
};