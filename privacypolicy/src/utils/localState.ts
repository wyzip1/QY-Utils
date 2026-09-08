class LocalState {
  state: Record<string, any> = { ...localStorage };

  constructor() {
    this.state = this.initParseData(this.state);
  }

  setState(any: ((...args: any[]) => any) | Record<string, any>) {
    const isFn = typeof any === "function";
    if (isFn) any(this.state);
    else this.state = any;

    this.#setLocalStorage(this.state);
  }

  #setLocalStorage(data: Record<string, any>) {
    for (const key in data) {
      let value: any;
      try {
        value = JSON.stringify(data[key]);
      } catch (err) {
        value = data[key];
      }
      localStorage.setItem(key, value);
    }
  }

  remove(key: string) {
    delete this.state[key];
    localStorage.removeItem(key);
  }

  clear() {
    this.state = {};
    localStorage.clear();
  }

  initParseData(data) {
    for (const key in data) {
      const value = data[key];
      try {
        data[key] = JSON.parse(value);
      } catch (err) {
        console.log("普通类型值", value);
      }
    }
    return data;
  }
}

export default new LocalState();
