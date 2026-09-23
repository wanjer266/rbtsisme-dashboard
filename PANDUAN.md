# e-Fail Panitia — Google Drive + GitHub Pages

Versi ini menggunakan folder Drive `1AXYqFzVWNJdnaUbQPaH8P9JS1x1hY1I2`.
Repositori sasaran: https://github.com/wanjer266/rbtsisme-dashboard
Alamat laman selepas GitHub Pages berjaya diterbitkan: https://wanjer266.github.io/rbtsisme-dashboard/

## Tetapan Google (sekali sahaja)

1. Buka https://console.cloud.google.com/ menggunakan akaun yang dibenarkan mencipta projek. Gunakan projek khusus aplikasi ini.
2. Aktifkan **Google Drive API** dan **Google Picker API**.
3. Dalam **Google Auth Platform**, lengkapkan nama aplikasi, e-mel sokongan dan e-mel pembangun. Pilih audiens yang sesuai: Internal jika hanya organisasi sendiri; External + Testing jika diperlukan, dan tambah akaun pengguna sebagai test user.
4. Tambah scope `https://www.googleapis.com/auth/drive.file`. Aplikasi meminta akses kepada fail yang dipilih/dicipta untuk aplikasi, bukan keseluruhan Drive.
5. Cipta OAuth Client jenis **Web application**. Authorized JavaScript origin: `https://wanjer266.github.io` (tanpa laluan repositori). Untuk ujian tempatan, tambah `http://127.0.0.1:8765`. Tiada redirect URI diperlukan untuk aliran token popup ini.
6. Cipta API key untuk Google Picker. Hadkan kepada laman web `https://wanjer266.github.io/*` (serta `http://127.0.0.1:8765/*` jika menguji). Hadkan API kepada Google Picker API. Gunakan projek yang sama dengan OAuth Client.
7. Isi **clientId**, **apiKey**, dan **projectNumber** dalam `config.js`. Client ID, API key pelayar yang dihadkan, dan nombor projek ialah tetapan awam. Jangan masukkan OAuth client secret, kata laluan atau access token.

Tetapan sambungan disediakan melalui `config.js` oleh pentadbir. Paparan utama mengekalkan semua HTML dan CSS asal, tanpa panel atau menu sambungan tambahan.

## Terbitkan melalui GitHub

1. Muat naik `index.html`, `drive.js`, `config.js`, `privacy.html` dan `PANDUAN.md` ke akar branch `main` repositori di atas.
2. Buka **Settings → Pages → Build and deployment**.
3. Pilih **Deploy from a branch → main → /(root) → Save**.
4. Tunggu GitHub selesai menerbitkan laman, kemudian buka alamat Pages di atas.

## Penggunaan

- Klik menu fail atau subjek seperti biasa. Selepas tetapan siap, Google akan meminta log masuk dan kebenaran Drive apabila diperlukan.
- Pada sambungan pertama, Google Picker mungkin dibuka. Pilih folder **ePanitia_Data** yang ID-nya sepadan dengan pautan di atas. Folder lain ditolak.
- Pilih subjek, tahun, fail dan subtajuk; tekan **Upload PDF**. Had: **5 MB** setiap PDF.
- Mesej berjaya hanya muncul selepas Google Drive mengesahkan simpanan. PDF serta metadata kategori disimpan dalam folder pilihan.
- PDF kekal mengikut kebenaran folder Drive. Aplikasi tidak menjadikannya awam. Halaman GitHub Pages dan kod aplikasi boleh dilihat awam, tetapi akses PDF memerlukan Google.
- Tajuk, tahun, status dan kategori PDF disimpan dalam medan Description fail Drive. Rekod kelas, pautan dan aktiviti disimpan sebagai fail JSON berasingan. Elakkan mengubah Description secara manual.
- Untuk komputer lain: buka alamat Pages yang sama, sambung Google menggunakan akaun yang sama dan projek OAuth yang sama.
- Klik semula menu atau subjek untuk mengambil perubahan terkini daripada Drive. Elakkan mengedit rekod yang sama serentak di dua peranti.
- **Padam** memindahkan PDF ke Sampah Drive. Untuk memulihkan, restore melalui Drive dan kemudian klik menu subjek untuk memuat semula rekod. Reset hanya menyentuh PDF yang didaftarkan oleh versi aplikasi ini.
- Menutup atau memuat semula halaman membuang token sesi daripada memori aplikasi. Kebenaran aplikasi boleh ditarik balik melalui tetapan akaun Google.
- Token disimpan dalam memori sahaja. Selepas refresh halaman atau sesi tamat, klik menu untuk menyambung Google semula. Apabila rangkaian terputus semasa muat naik, klik menu subjek untuk memuat semula rekod sebelum cuba lagi untuk mengelakkan salinan pendua.

## Data versi lama

Versi asal menyimpan PDF melalui IndexedDB pelayar. Data itu tidak berpindah hanya dengan memuat naik `index.html` ke GitHub. Muat turun PDF daripada aplikasi lama dan muat naik semula melalui aplikasi ini.

Folder pilihan sudah mengandungi `epanitia_db.json` dan dua PDF daripada versi terdahulu. Versi ini tidak menindih fail tersebut atau mengimportnya secara automatik. Untuk mendaftarkan PDF lama dalam versi ini, muat turun dan muat naik semula mengikut kategori yang betul. Rekod baharu tidak bergantung pada `epanitia_db.json`.

## Pengesahan

Kod diperiksa sintaksnya. Ujian API simulasi menguji sasaran folder, muat naik/baca/edit, pemulihan rekod selepas log masuk semula, penolakan fail bukan PDF/terlalu besar, ralat API tanpa kejayaan palsu, konflik edit dan pemindahan ke Sampah. Pengesahan Google dan ujian muat naik sebenar masih memerlukan tetapan projek Google yang sah.

Rujukan rasmi:
- https://developers.google.com/identity/oauth2/web/guides/use-token-model
- https://developers.google.com/workspace/drive/api/guides/api-specific-auth
- https://developers.google.com/workspace/drive/picker/guides/overview
- https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site


