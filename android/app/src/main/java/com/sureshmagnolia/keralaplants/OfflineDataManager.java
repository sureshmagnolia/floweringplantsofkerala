package com.sureshmagnolia.keralaplants;

import android.app.DownloadManager;
import android.content.Context;
import android.net.Uri;
import android.os.Environment;
import android.util.Base64;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.InputStream;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;

@CapacitorPlugin(name = "OfflineDataManager")
public class OfflineDataManager extends Plugin {

    private File getBestExternalDir() {
        File[] externalDirs = ContextCompat.getExternalFilesDirs(getContext(), null);
        File targetDir = externalDirs.length > 0 ? externalDirs[0] : null;
        if (externalDirs.length > 1 && externalDirs[1] != null) {
            String state = Environment.getExternalStorageState(externalDirs[1]);
            if (Environment.MEDIA_MOUNTED.equals(state)) {
                targetDir = externalDirs[1];
            }
        }
        if (targetDir == null) {
            targetDir = getContext().getExternalFilesDir(null);
        }
        return targetDir;
    }

    @PluginMethod
    public void startDownload(PluginCall call) {
        String url = call.getString("url");
        if (url == null) {
            call.reject("Must provide a URL");
            return;
        }
        
        try {
            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
            request.setTitle("Downloading Offline Dataset");
            request.setDescription("Fetching image dataset for Kerala Plants");
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            
            // Using getBestExternalDir to prefer SD Card if available
            File dest = new File(getBestExternalDir(), "images.zip");
            if (dest.exists()) {
                dest.delete();
            }
            
            request.setDestinationUri(Uri.fromFile(dest));
            
            DownloadManager manager = (DownloadManager) getContext().getSystemService(Context.DOWNLOAD_SERVICE);
            manager.enqueue(request);
            
            call.resolve();
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void checkExists(PluginCall call) {
        File dest = new File(getBestExternalDir(), "images.zip");
        JSObject ret = new JSObject();
        ret.put("exists", dest.exists());
        if (dest.exists()) {
            ret.put("size", dest.length());
        }
        call.resolve(ret);
    }
    
    @PluginMethod
    public void getImage(PluginCall call) {
        String filename = call.getString("filename");
        if (filename == null) {
            call.reject("Must provide a filename");
            return;
        }
        
        File zipPath = new File(getBestExternalDir(), "images.zip");
        if (!zipPath.exists()) {
            call.reject("images.zip not found");
            return;
        }
        
        try (ZipFile zipFile = new ZipFile(zipPath)) {
            ZipEntry entry = zipFile.getEntry(filename);
            if (entry == null) {
                call.reject("Image not found in zip");
                return;
            }
            
            InputStream is = zipFile.getInputStream(entry);
            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
            int nRead;
            byte[] data = new byte[16384];
            while ((nRead = is.read(data, 0, data.length)) != -1) {
                buffer.write(data, 0, nRead);
            }
            buffer.flush();
            byte[] imageBytes = buffer.toByteArray();
            
            String base64Image = Base64.encodeToString(imageBytes, Base64.NO_WRAP);
            
            JSObject ret = new JSObject();
            ret.put("data", "data:image/jpeg;base64," + base64Image);
            call.resolve(ret);
            
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }
}
