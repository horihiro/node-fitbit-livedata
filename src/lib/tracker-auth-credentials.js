export default class TrackerAuthCredentials {
  constructor(str, str2) {
    this.f21170d = str;
    this.f21171e = str2.toString();

    if (this.f21170d && this.f21171e) {
      const arrayList = [];
      const cArr = ['0', '0'];
      for (let i2 = 0; i2 < this.f21170d.length / 2; i2 += 1) {
        cArr[0] = this.f21170d[(i2 * 2)];
        cArr[1] = this.f21170d[(i2 * 2) + 1];
        arrayList.push(parseInt((`0x${cArr[0]}${cArr[1]}`), 10));
      }
      this.f21168b = [];
      arrayList.forEach((byte) => {
        this.f21168b.push(byte);
      });
      this.f21169c = parseInt(this.f21171e, 10);
    }
  }
}
