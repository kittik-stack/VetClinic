//сборка цепочки хендлеров
const { RequiredFieldsHandler, PhoneHandler } = require('./handlers');

const chain = new RequiredFieldsHandler(['phone', 'password']);
chain.setNext(new PhoneHandler());

module.exports = chain;