//базовый класс
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

module.exports = Handler;