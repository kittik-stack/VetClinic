//сборка цепочки хендлеров
const { RequiredFieldsHandler, PhoneHandler, EmailHandler, PasswordHandler } = require('./handlers');

const chain = new RequiredFieldsHandler(['full_name', 'phone', 'email', 'password']);
chain.setNext(new PhoneHandler())
    .setNext(new EmailHandler())
    .setNext(new PasswordHandler());

module.exports = chain;