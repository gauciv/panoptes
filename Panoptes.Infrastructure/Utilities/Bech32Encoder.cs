namespace Panoptes.Infrastructure.Utilities
{
    public static class Bech32Encoder
    {
        private const string Charset = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";

        public static string ConvertToBech32Address(string hexAddress)
        {
            if (string.IsNullOrEmpty(hexAddress))
                return hexAddress;

            try
            {
                var bytes = Convert.FromHexString(hexAddress);
                if (bytes.Length == 0)
                    return hexAddress;

                var networkId = bytes[0] & 0x0F;
                var prefix = (networkId == 1) ? "addr" : "addr_test";
                return Encode(prefix, bytes);
            }
            catch
            {
                return hexAddress;
            }
        }

        public static string Encode(string hrp, byte[] data)
        {
            var converted = ConvertBits(data, 8, 5, true);
            if (converted == null)
                return string.Empty;

            var values = new List<byte>();
            values.AddRange(ExpandHrp(hrp));
            values.AddRange(converted);
            values.AddRange(new byte[] { 0, 0, 0, 0, 0, 0 });

            var polymod = Polymod(values);
            var checksum = new byte[6];
            for (int i = 0; i < 6; i++)
                checksum[i] = (byte)((polymod >> (5 * (5 - i))) & 31);

            var combined = new List<byte>(converted);
            combined.AddRange(checksum);

            var result = hrp + "1";
            foreach (var value in combined)
                result += Charset[value];

            return result;
        }

        private static byte[]? ConvertBits(byte[] data, int fromBits, int toBits, bool pad)
        {
            var acc = 0;
            var bits = 0;
            var result = new List<byte>();
            var maxv = (1 << toBits) - 1;

            foreach (var value in data)
            {
                acc = (acc << fromBits) | value;
                bits += fromBits;
                while (bits >= toBits)
                {
                    bits -= toBits;
                    result.Add((byte)((acc >> bits) & maxv));
                }
            }

            if (pad && bits > 0)
                result.Add((byte)((acc << (toBits - bits)) & maxv));
            else if (bits >= fromBits || ((acc << (toBits - bits)) & maxv) != 0)
                return null;

            return result.ToArray();
        }

        private static byte[] ExpandHrp(string hrp)
        {
            var result = new List<byte>();
            foreach (var c in hrp)
                result.Add((byte)(c >> 5));
            result.Add(0);
            foreach (var c in hrp)
                result.Add((byte)(c & 31));
            return result.ToArray();
        }

        private static uint Polymod(List<byte> values)
        {
            uint[] gen = { 0x3b6a57b2u, 0x26508e6du, 0x1ea119fau, 0x3d4233ddu, 0x2a1462b3u };
            uint chk = 1;

            foreach (var value in values)
            {
                var top = chk >> 25;
                chk = ((chk & 0x1ffffff) << 5) ^ value;
                for (int i = 0; i < 5; i++)
                {
                    if (((top >> i) & 1) != 0)
                        chk ^= gen[i];
                }
            }

            return chk ^ 1;
        }
    }
}
