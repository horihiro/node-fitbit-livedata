import java.util.ArrayList;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;

import org.spongycastle.crypto.BlockCipher;
import org.spongycastle.crypto.engines.AESEngine;
import org.spongycastle.crypto.engines.XTEAEngine;
import org.spongycastle.crypto.macs.CMac;
import org.spongycastle.crypto.params.KeyParameter;
import org.spongycastle.crypto.engines.AESEngine;

class Main {
  public static void main(String args[]) {
    String input = args[0];
    String authSubKey = args[1];
    String cryptType = args[2];
    ArrayList<Byte> byteArray = new ArrayList<Byte>();

    while (input.length() > 0) {
      String b = input.substring(0, 2);
      Integer i = Integer.decode("0x" + b);
      byteArray.add(i.byteValue());

      input = input.substring(2);
    }

    byte[] iArr = new byte[byteArray.size()];
    for (int i = 0; i < byteArray.size(); i++) {
      iArr[i] = byteArray.get(i).byteValue();
    }

    byte[] bArr = m25389a(new TrackerAuthCredentials(authSubKey, cryptType), m24038b(iArr, 10));
    System.out.println(m8324a(bArr));
  }

  private static int m24038b(byte[] bArr, int i) {
    return ((((bArr[i + 3] << 24) & 0xff000000 ) | ((bArr[i + 2] << 16) & 16711680)) | ((bArr[i + 1] << 8) & 0x0000ff00 )) | (bArr[i] & 255);
  }

  private static byte[] m25389a(TrackerAuthCredentials trackerAuthCredentials, int... iArr) {
    BlockCipher eVar = null;
    if (iArr == null || iArr.length == 0) {
        return null;
    }
    if (trackerAuthCredentials == null || trackerAuthCredentials.m25378c() == null || trackerAuthCredentials.m25378c().length != 16) {
        return null;
    }
    eVar = trackerAuthCredentials.getAuthType().equals("AES") ? new AESEngine() : new XTEAEngine();
    CMac dVar = new CMac(eVar, 64);
    dVar.init(new KeyParameter(trackerAuthCredentials.m25378c()));
    ByteBuffer allocate = ByteBuffer.allocate(iArr.length * 4);
    allocate.order(ByteOrder.LITTLE_ENDIAN);
    for (int putInt : iArr) {
        allocate.putInt(putInt);
    }
    dVar.update(allocate.array(), 0, iArr.length * 4);
    byte[] bArr = new byte[8];
    dVar.doFinal(bArr, 0);
    return bArr;
  }

  private static String m8324a(byte[] bArr) {
    byte[] bArr2 = m24049a(bArr);
    StringBuilder sb = new StringBuilder();
    for (byte d : bArr2) {
      sb.append(String.format("%02x", d));
    }
    return sb.toString();
  }

  public static byte[] m24049a(byte[] bArr) {
    C4508l c4508l = new C4508l();
    c4508l.f19852j = (byte) -64;
    c4508l.f19853k = (byte) 2;
    c4508l.f19854l = (byte) 5;
    c4508l.f19855m = (byte) 0;
    c4508l.f19930b = bArr;
    return c4508l.mo4322a();
  }

  public static class C4508l {
    public byte f19852j;
    public byte f19853k;
    public byte f19854l;
    public byte f19855m;
    public byte[] f19930b;

    public byte[] mo4322a() {
      ByteBuffer allocate = ByteBuffer.allocate(10);
      allocate.order(ByteOrder.LITTLE_ENDIAN);
      allocate.put( new byte[]{this.f19852j, (byte) (((this.f19855m << 7) | ((this.f19854l & 15) << 4)) | this.f19853k)});
      allocate.put(this.f19930b);
      return allocate.array();
    }
  }
}