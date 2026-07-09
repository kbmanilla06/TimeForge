<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SetUserTimezone
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $timezone = config('app.timezone');

        if ($request->user() && $request->user()->timezone) {
            $timezone = $request->user()->timezone;
        } elseif ($request->hasHeader('X-Timezone')) {
            $headerTz = $request->header('X-Timezone');
            if (in_array($headerTz, timezone_identifiers_list(), true)) {
                $timezone = $headerTz;
            }
        }

        date_default_timezone_set($timezone);
        config(['app.timezone' => $timezone]);

        return $next($request);
    }
}
