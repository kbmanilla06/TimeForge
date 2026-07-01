<?php

namespace App\Http\Controllers;

use App\Models\Client;
use Illuminate\Http\JsonResponse;

/**
 * Read-only, self-service listing for any active user (e.g. to populate a
 * client selector when logging time). Full CRUD remains admin-only via
 * App\Http\Controllers\Admin\ClientController.
 */
class ClientController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(Client::all());
    }
}
