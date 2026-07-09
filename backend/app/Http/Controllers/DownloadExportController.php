<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class DownloadExportController extends Controller
{
    public function download(Request $request, string $filename): BinaryFileResponse
    {
        // The signature is validated by the 'signed' middleware
        $filePath = "exports/{$filename}";

        if (!Storage::disk('local')->exists($filePath)) {
            abort(404, 'The requested export file does not exist or has expired.');
        }

        $absolutePath = Storage::disk('local')->path($filePath);

        // Clean name for the browser download
        $cleanName = str_starts_with($filename, 'export-') 
            ? 'report-' . substr($filename, 7)
            : $filename;

        return response()->download($absolutePath, $cleanName)->deleteFileAfterSend(true);
    }
}
