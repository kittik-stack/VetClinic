class Handler {
  setNext(handler) {
    this.next = handler;
    return handler;
  }

  async handle(data) {
    if (this.next) return this.next.handle(data);
    return data;
  }
}

class RequiredFieldsHandler extends Handler {
  async handle(data) {
    for (const field of ['full_name', 'phone', 'email', 'password']) {
      if (!data[field]) throw new HttpError(400, 'Все поля обязательны для заполнения');
    }
    return super.handle(data);
  }
}