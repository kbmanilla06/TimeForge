<?php

namespace App\Support;

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Thin wrapper around PhpSpreadsheet for writing a single-sheet .xlsx
 * download, shared by the Payroll Report and Team Hours Report exports
 * so the XLSX-writing mechanics aren't duplicated between them.
 */
final class ExcelExporter
{
    /**
     * @param  string[]  $headings
     * @param  array<int, array<int, mixed>>  $rows
     */
    public static function download(string $sheetTitle, array $headings, array $rows, string $filename): StreamedResponse
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle($sheetTitle);
        $sheet->fromArray($headings, null, 'A1');
        $sheet->fromArray($rows, null, 'A2');

        return new StreamedResponse(function () use ($spreadsheet) {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
        }, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    /**
     * @param  string[]  $headings
     * @param  array<int, array<int, mixed>>  $rows
     */
    public static function save(string $sheetTitle, array $headings, array $rows, string $filePath): void
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle($sheetTitle);
        $sheet->fromArray($headings, null, 'A1');
        $sheet->fromArray($rows, null, 'A2');

        $writer = new Xlsx($spreadsheet);
        $writer->save($filePath);
    }
}
