import java.util.ArrayList;
import java.util.List;

public final class TrackerAuthCredentials {
    public static final String f21167a = "TrackerAuthCredentials";
    private byte[] f21168b;
    private final String f21170d;
    private final String authType;
    
    public TrackerAuthCredentials(String str, String str2) {
        this.f21170d = str;
        this.authType = str2;
        m25375e();
    }

    public boolean m25376a() {
        return (this.f21170d != null && this.f21170d.length() != 0 );
    }

    private void m25375e() {
        int i = 0;
        if (m25376a()) {
            List<Byte> arrayList = new ArrayList<Byte>();
            char[] cArr = new char[]{'0', '0'};
            for (int i2 = 0; i2 < this.f21170d.length() / 2; i2++) {
                cArr[0] = this.f21170d.charAt(i2 * 2);
                cArr[1] = this.f21170d.charAt((i2 * 2) + 1);
                arrayList.add(Byte.valueOf((byte) Integer.decode(String.format("0x%c%c", Character.valueOf(cArr[0]), Character.valueOf(cArr[1]))).intValue()));
            }
            this.f21168b = new byte[arrayList.size()];
            while (i < arrayList.size()) {
                this.f21168b[i] = ((Byte) arrayList.get(i)).byteValue();
                i++;
            }
        }
    }

    public byte[] m25378c() {
        return this.f21168b;
    }

    public String getAuthType() {
        return this.authType;
    }
}
