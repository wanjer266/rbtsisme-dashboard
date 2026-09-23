/* Google Drive storage. OAuth tokens live only in memory. */
const DriveStore = (() => {
  const scope = 'https://www.googleapis.com/auth/drive.file';
  const app = 'panitia-drive-v1';
  const api = 'https://www.googleapis.com/drive/v3';
  const collections = ['documents', 'classes', 'links', 'activities'];
  let token = '', expires = 0, folder = '', account = '', ready = false;
  let records = Object.fromEntries(collections.map(k => [k, []]));
  const notify = () => window.dispatchEvent(new Event('drive-state'));
  const copy = value => structuredClone(value);
  function disconnect() {
    token = ''; expires = 0; folder = ''; account = ''; ready = false;
    records = Object.fromEntries(collections.map(k => [k, []]));
    notify();
  }
  function requireToken() {
    if (!token || Date.now() >= expires) {
      disconnect();
      throw new Error('Sesi Google tamat atau belum disambung. Klik menu subjek untuk log masuk.');
    }
  }
  async function request(url, options = {}, raw = false) {
    requireToken();
    let response;
    try {
      response = await fetch(url, {...options, headers: {...options.headers, Authorization: 'Bearer ' + token}});
    } catch {
      throw new Error('Sambungan terputus. Klik menu subjek untuk memuat semula rekod sebelum mencuba lagi untuk menyemak sama ada fail telah disimpan.');
    }
    if (!response.ok) {
      if (response.status === 401) { disconnect(); throw new Error('Sesi Google tamat. Klik menu subjek untuk log masuk semula.'); }
      let detail = '';
      try { detail = (await response.json()).error?.message || ''; } catch {}
      const error = new Error('Google Drive (' + response.status + '): ' + (detail || 'Permintaan gagal. Cuba lagi.'));
      error.status = response.status;
      throw error;
    }
    return raw ? response : response.status === 204 ? null : response.json();
  }
  async function list(query) {
    const files = []; let pageToken;
    do {
      const params = new URLSearchParams({q: query, spaces:'drive', pageSize:'1000', fields:'nextPageToken,files(id,name,description,appProperties,modifiedTime)', ...(pageToken ? {pageToken} : {})});
      const data = await request(api + '/files?' + params);
      files.push(...(data.files || [])); pageToken = data.nextPageToken;
    } while (pageToken);
    return files;
  }
  async function refresh() {
    requireToken();
    const files = await list("'" + folder + "' in parents and trashed = false");
    const next = Object.fromEntries(collections.map(k => [k, []]));
    let invalid = 0;
    for (const file of files) {
      const kind = file.appProperties?.collection;
      if (file.appProperties?.app !== app || !collections.includes(kind)) continue;
      try {
        const value = JSON.parse(file.description);
        if (!Number.isSafeInteger(value.id) || value.id <= 0 || value.schema !== 1) throw new Error('Invalid record');
        next[kind].push({...value, _driveId: file.id, _modified: file.modifiedTime});
      } catch { invalid++; }
    }
    if (invalid) throw new Error(invalid + ' rekod Drive tidak dapat dibaca. Data belum dimuat semula; semak Description fail atau pulihkan versi sebelumnya dalam Drive.');
    records = next; ready = true; notify();
  }
  function authorize(clientId) {
    return new Promise((resolve, reject) => {
      if (!window.google?.accounts?.oauth2) return reject(new Error('Skrip Google belum dimuatkan. Semak internet dan cuba lagi.'));
      const client = google.accounts.oauth2.initTokenClient({
        client_id:clientId, scope, include_granted_scopes:false,
        callback: result => {
          if (result.error || !result.access_token) return reject(new Error('Sambungan Google tidak diluluskan: ' + (result.error || 'tiada token')));
          if (!google.accounts.oauth2.hasGrantedAllScopes(result, scope)) return reject(new Error('Benarkan akses fail aplikasi untuk menyimpan PDF.'));
          token = result.access_token; expires = Date.now() + Number(result.expires_in || 3600) * 1000 - 30000;
          resolve();
        },
        error_callback: () => reject(new Error('Tetingkap log masuk ditutup atau disekat. Benarkan pop-up dan cuba semula.'))
      });
      client.requestAccessToken({prompt:'select_account'});
    });
  }
  function chooseFolder(apiKey, projectNumber, targetFolder) {
    return new Promise((resolve, reject) => {
      if (!apiKey || !projectNumber) return reject(new Error('Isi API Key dan Google Cloud Project Number dalam config.js untuk membenarkan folder pilihan.'));
      if (!window.gapi) return reject(new Error('Google Picker belum dimuatkan. Semak internet.'));
      gapi.load('picker', {callback: () => {
        const view = new google.picker.DocsView(google.picker.ViewId.FOLDERS).setIncludeFolders(true).setSelectFolderEnabled(true);
        new google.picker.PickerBuilder().addView(view).setOAuthToken(token).setDeveloperKey(apiKey).setAppId(projectNumber)
          .setOrigin(location.origin).setTitle('Pilih folder e-Fail yang telah ditetapkan')
          .setCallback(data => {
            if (data.action === google.picker.Action.CANCEL) reject(new Error('Pemilihan folder dibatalkan.'));
            if (data.action === google.picker.Action.PICKED) {
              if (data.docs?.[0]?.id !== targetFolder) reject(new Error('Folder tidak sepadan. Pilih folder daripada pautan Drive yang ditetapkan.'));
              else resolve();
            }
          }).build().setVisible(true);
      }, onerror: () => reject(new Error('Google Picker gagal dimuatkan.')), timeout:15000, ontimeout: () => reject(new Error('Google Picker terlalu lambat. Cuba lagi.'))});
    });
  }
  async function connect(clientId, apiKey, projectNumber, targetFolder) {
    if (!/^[\w.-]+\.apps\.googleusercontent\.com$/.test(clientId)) throw new Error('Isi Google OAuth Client ID yang sah dalam config.js.');
    if (location.protocol === 'file:') throw new Error('Sambungan Google memerlukan laman GitHub Pages atau localhost. Rujuk PANDUAN.md.');
    disconnect();
    try {
      await authorize(clientId);
      const about = await request(api + '/about?fields=user(displayName,emailAddress)');
      account = about.user?.emailAddress || about.user?.displayName || 'Akaun Google';
      if (!/^[\w-]+$/.test(targetFolder)) throw new Error('ID folder Drive tidak sah.');
      const folderUrl = api+'/files/'+targetFolder+'?fields=id,mimeType,trashed,capabilities(canAddChildren)';
      let selected;
      try { selected = await request(folderUrl); }
      catch (error) {
        if (error.status !== 404 && error.status !== 403) throw error;
        await chooseFolder(apiKey,projectNumber,targetFolder);
        selected = await request(folderUrl);
      }
      if (selected.trashed || selected.mimeType !== 'application/vnd.google-apps.folder' || !selected.capabilities?.canAddChildren) throw new Error('Folder tidak tersedia atau akaun ini tiada izin memuat naik. Gunakan akaun pemilik/editor folder.');
      folder = selected.id;
      await refresh();
    } catch (error) { disconnect(); throw error; }
  }
  function requireReady() { requireToken(); if (!ready) throw new Error('Muat semula rekod Drive dahulu.'); }
  function uniqueId() {
    let id;
    do { const a = crypto.getRandomValues(new Uint32Array(2)); id = (a[0] & 0x1fffff) * 4294967296 + a[1]; }
    while (!id || Object.values(records).some(arr => arr.some(r => r.id === id)));
    return id;
  }
  async function write(kind, value, existing) {
    requireReady();
    const {fileBlob, _driveId, _modified, ...metadata} = value;
    metadata.schema = 1;
    if (kind === 'documents' && !existing) {
      if (!(fileBlob instanceof Blob)) throw new Error('Fail PDF tidak ditemui.');
      if (fileBlob.size > 5 * 1024 * 1024) throw new Error('Had muat naik ialah 5 MB setiap PDF. Kecilkan saiz PDF dahulu.');
      const header = await fileBlob.slice(0, 5).text();
      if (header !== '%PDF-') throw new Error('Kandungan fail bukan PDF yang sah.');
    }
    if (existing) {
      const current = await request(api + '/files/' + existing._driveId + '?fields=modifiedTime,trashed');
      if (current.trashed || current.modifiedTime !== existing._modified) throw new Error('Rekod telah berubah pada peranti lain. Klik menu subjek untuk memuat semula rekod sebelum mengedit lagi.');
    }
    const details = {
      name: kind === 'documents' ? value.fileName : kind + '-' + value.id + '.json',
      description: JSON.stringify(metadata),
      appProperties:{app,collection:kind},
      ...(!existing ? {parents:[folder], mimeType:kind === 'documents' ? 'application/pdf' : 'application/json'} : {})
    };
    let result;
    if (existing && kind === 'documents') {
      result = await request(api + '/files/' + existing._driveId + '?fields=id,modifiedTime', {method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(details)});
    } else {
      const boundary = 'panitia_' + crypto.randomUUID();
      const content = kind === 'documents' ? fileBlob : new Blob([JSON.stringify(metadata)], {type:'application/json'});
      const body = new Blob(['--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n',JSON.stringify(details),'\r\n--'+boundary+'\r\nContent-Type: '+(kind === 'documents' ? 'application/pdf' : 'application/json')+'\r\n\r\n',content,'\r\n--'+boundary+'--\r\n']);
      result = await request('https://www.googleapis.com/upload/drive/v3/files' + (existing ? '/'+existing._driveId : '') + '?uploadType=multipart&fields=id,modifiedTime', {method:existing?'PATCH':'POST', headers:{'Content-Type':'multipart/related; boundary='+boundary}, body});
    }
    const saved = {...metadata, _driveId:result.id, _modified:result.modifiedTime};
    const index = records[kind].findIndex(x => x.id === value.id);
    if (index < 0) records[kind].push(saved); else records[kind][index] = saved;
    return value.id;
  }
  async function remove(kind, id) {
    requireReady();
    const value = records[kind].find(x => x.id === Number(id));
    if (!value) throw new Error('Rekod tidak ditemui. Klik menu subjek untuk memuat semula rekod.');
    await request(api + '/files/' + value._driveId, {method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({trashed:true})});
    records[kind] = records[kind].filter(x => x.id !== Number(id));
  }
  return {
    connect, disconnect, refresh,
    state: () => ({ready:ready && Date.now() < expires, account, folder}),
    all: async kind => copy(records[kind]),
    one: async (kind,id) => copy(records[kind].find(x => x.id === Number(id))),
    add: (kind,value) => write(kind,{...value,id:uniqueId()},null),
    put: (kind,value) => {
      const existing = records[kind].find(x => x.id === value.id);
      if (!existing) throw new Error('Rekod tidak ditemui. Klik menu subjek untuk memuat semula rekod.');
      return write(kind,value,existing);
    },
    remove,
    clear: async kind => { for (const value of [...records[kind]]) await remove(kind,value.id); },
    pdf: async id => {
      requireReady();
      const d = records.documents.find(x => x.id === Number(id));
      if (!d) throw new Error('PDF tidak ditemui.');
      return (await request(api+'/files/'+d._driveId+'?alt=media',{},true)).blob();
    }
  };
})();

