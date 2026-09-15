<?php

declare(strict_types=1);

namespace GreenSense\Dominio;

/**
 * Representa un invernadero/vivero registrado por el productor.
 */
final class Invernadero
{
    public function __construct(
        private int $id,
        private string $nombre,
        private string $ubicacion,
        private string $cultivo,
        private bool $enLinea
    ) {
    }

    public function id(): int
    {
        return $this->id;
    }

    public function toJson(): array
    {
        return [
            'id' => (string) $this->id,
            'nombre' => $this->nombre,
            'ubicacion' => $this->ubicacion,
            'cultivo' => $this->cultivo,
            'enLinea' => $this->enLinea,
        ];
    }
}