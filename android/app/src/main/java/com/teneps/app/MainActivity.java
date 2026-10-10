package com.teneps.app;

import android.annotation.SuppressLint;
import android.Manifest;
import android.app.Activity;
import android.content.ContentValues;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

public class MainActivity extends Activity {

    private static final int REQ_STORAGE = 42;

    private WebView webView;

    // Fichier en attente quand la permission stockage (Android 6-9) doit être demandée
    private byte[] pendingData;
    private String pendingName;
    private String pendingMime;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Plein écran immersif
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        );
        // Écran toujours allumé pendant la séance (l'API Wake Lock du WebView n'est pas fiable
        // sur les tablettes dont le WebView est figé)
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        masquerBarresSysteme();

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();

        // Activer JavaScript (indispensable pour l'app)
        settings.setJavaScriptEnabled(true);

        // Stockage local (localStorage) - indispensable pour la persistance
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);

        // Cache pour fonctionnement offline
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        // Permettre l'accès aux fichiers locaux
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);

        // Support du viewport et du zoom
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(false);

        // Encodage UTF-8
        settings.setDefaultTextEncodingName("UTF-8");

        // Empêcher l'ouverture de liens dans un navigateur externe
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                // Seul le contenu local est autorisé : l'interface AndroidDownload ne doit
                // jamais être exposée à une page externe.
                return !url.startsWith("file:///android_asset/");
            }
        });

        // Interface JS -> Java pour les téléchargements (XLSX des classements)
        webView.addJavascriptInterface(new DownloadInterface(), "AndroidDownload");

        webView.setWebChromeClient(new WebChromeClient());

        // Charger l'application depuis les assets
        webView.loadUrl("file:///android_asset/index.html");
    }

    // Mode immersif persistant : les barres réapparaissent au balayage puis se re-masquent
    @SuppressWarnings("deprecation")
    private void masquerBarresSysteme() {
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            | View.SYSTEM_UI_FLAG_FULLSCREEN
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) masquerBarresSysteme();
    }

    // Le bouton Retour est délégué à la page : fermer la fenêtre ouverte, revenir à l'accueil, et
    // ne quitter qu'au second appui rapproché (voir window.__androidBack dans index.html).
    @Override
    public void onBackPressed() {
        if (webView == null) {
            super.onBackPressed();
            return;
        }
        webView.evaluateJavascript(
            "(function(){return window.__androidBack?window.__androidBack():'quit';})()",
            new ValueCallback<String>() {
                @Override
                public void onReceiveValue(String value) {
                    if (value != null && value.contains("quit")) {
                        finish();
                    }
                }
            });
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (webView != null) {
            // Déclencher la sauvegarde localStorage via visibilitychange
            webView.evaluateJavascript("document.dispatchEvent(new Event('visibilitychange'));", null);
        }
    }

    /**
     * Interface JavaScript pour sauvegarder des fichiers depuis le WebView.
     * Appelée via : AndroidDownload.saveFile(contenuBase64, nomFichier, typeMime)
     */
    public class DownloadInterface {
        @JavascriptInterface
        public void saveFile(String base64Data, String fileName, String mimeType) {
            final byte[] data = Base64.decode(base64Data, Base64.DEFAULT);
            // Nom de fichier saisi par l'utilisateur (classe...) : on retire les séparateurs de chemin
            final String safeName = fileName.replaceAll("[\\\\/:*?\"<>|]", "_");
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    ecrire(data, safeName, mimeType);
                }
            });
        }
    }

    private void ecrire(byte[] data, String fileName, String mimeType) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // Android 10+ : MediaStore, aucune permission nécessaire
                ContentValues values = new ContentValues();
                values.put(MediaStore.Downloads.DISPLAY_NAME, fileName);
                values.put(MediaStore.Downloads.MIME_TYPE, mimeType);
                values.put(MediaStore.Downloads.IS_PENDING, 1);
                android.net.Uri uri = getContentResolver().insert(
                        MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                if (uri == null) throw new Exception("création du fichier impossible");
                OutputStream os = getContentResolver().openOutputStream(uri);
                if (os == null) throw new Exception("écriture impossible");
                try { os.write(data); } finally { os.close(); }
                values.clear();
                values.put(MediaStore.Downloads.IS_PENDING, 0);
                getContentResolver().update(uri, values, null, null);
            } else {
                // Android 6-9 : écriture directe dans Téléchargements (permission à l'exécution)
                if (checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE)
                        != PackageManager.PERMISSION_GRANTED) {
                    pendingData = data;
                    pendingName = fileName;
                    pendingMime = mimeType;
                    requestPermissions(new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, REQ_STORAGE);
                    return;
                }
                File dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                if (!dir.exists()) dir.mkdirs();
                FileOutputStream fos = new FileOutputStream(new File(dir, fileName));
                try { fos.write(data); } finally { fos.close(); }
            }
            Toast.makeText(this, "✅ " + fileName + " sauvegardé dans Téléchargements", Toast.LENGTH_LONG).show();
        } catch (Exception e) {
            Toast.makeText(this, "❌ Erreur : " + e.getMessage(), Toast.LENGTH_LONG).show();
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != REQ_STORAGE) return;
        if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED && pendingData != null) {
            ecrire(pendingData, pendingName, pendingMime);
        } else {
            Toast.makeText(this, "❌ Permission refusée : fichier non sauvegardé", Toast.LENGTH_LONG).show();
        }
        pendingData = null;
    }
}
