//конкретные хендлеры

const Handler = require('./handler');
const { HttpError } = require('../errors');

class RequiredFieldsHandler extends Handler {
    constructor(fields) {
        super();
        this.fields = fields;
    }

    async handle(data) {
        for (const field of this.fields) {
            if (!String(data[field] ?? '').trim()) {
                throw new HttpError(400, 'Все поля обязательны для заполнения');
            }
        }
        return super.handle(data);
    }
}

class PhoneHandler extends Handler {
    async handle(data) {
        const cleanPhone = String(data?.phone ?? '').replace(/[^\d+]/g, '');
        if (!/^\+375\d{9}$/.test(cleanPhone)) {
            throw new HttpError(400, 'Телефон должен быть в формате +375XXXXXXXXX');
        }

        return super.handle({ ...data, phone: cleanPhone });
    }
}

class EmailHandler extends Handler {
    async handle(data) {
        const email = String(data.email || '').trim();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new HttpError(400, 'Некорректный email');
        }
        return super.handle({ ...data, email });
    }
}

class PasswordHandler extends Handler {
    async handle(data) {
        const password = String(data?.password ?? '' );
        if (String(password).length < 6){
            throw new HttpError(400, 'Пароль должен содержать минимум 6 символов');
        }
        return super.handle({ ...data, password });

    }
}

module.exports = { RequiredFieldsHandler, PhoneHandler, EmailHandler, PasswordHandler };