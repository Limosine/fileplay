package main

import "errors"

var (
	errListeningAddressInvalid = errors.New("turn: RelayAddressGenerator has invalid ListeningAddress")
	errMaxRetriesExceeded      = errors.New("turn: max retries exceeded")
	errMaxPortNotZero          = errors.New("turn: MaxPort must be not 0")
	errMinPortNotZero          = errors.New("turn: MaxPort must be not 0")
	errNilConn                 = errors.New("turn: conn cannot not be nil")
	errTODO                    = errors.New("turn: TODO")
)
