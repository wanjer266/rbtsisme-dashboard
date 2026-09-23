# e-Fail Panitia

Laman: https://wanjer266.github.io/rbtsisme-dashboard/

Paparan HTML dan CSS asal dikekalkan. Pilih subjek, tahun, fail dan subtajuk, kemudian gunakan Upload PDF seperti biasa. Had setiap PDF ialah 5 MB.

PDF disimpan dalam folder ePanitia_Data melalui Google Apps Script milik akaun sekolah. Deployment sambungan hanya membenarkan pemilik. Log masuk ke akaun Google sekolah yang memiliki folder tersebut; jika diminta, benarkan tetingkap sambungan Google dibuka. Tiada token atau kata laluan disimpan dalam GitHub.

Rekod lama epanitia_db.json dibaca secara automatik. Simpanan baharu menggunakan epanitia_github_db.json; fail asal dikekalkan. Klik menu subjek untuk memuat semula data. Jangan ubah fail JSON secara manual semasa aplikasi digunakan.

Butang Padam memindahkan PDF berdaftar ke Sampah Drive. Pemulihan fail dalam Drive tidak memulihkan rekod kategori yang telah dipadam; muat naik semula untuk mendaftarkannya. Folder atau PDF tidak dijadikan awam.

config.js mengandungi alamat deployment sahaja. Kod Apps Script berada dalam projek sedia ada pemilik. GitHub Pages menghoskan paparan, manakala PDF dan rekod disimpan di Google Drive.
