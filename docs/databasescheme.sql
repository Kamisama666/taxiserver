/*DATABASE SCHEME
===============
*/

create database taxiserver;
use taxiserver;
create table usuarios (
	id int AUTO_INCREMENT,
	usuario varchar(20) NOT NULL,
	password varchar(72) NOT NULL,
	secret varchar(20),
	nombre varchar(40),
	extension varchar(20),
	tipo ENUM('CLIENT','DRIVER','COMMSERVER','ADMIN') NOT NULL,
	PRIMARY KEY(id)
) engine=innodb;
create table localizaciones (
	id int AUTO_INCREMENT,
	nombre varchar(40),
	lat1 float(10,6),
	lon1 float(10,6),
	lat2 float(10,6),
	lon2 float(10,6),
	lat3 float(10,6),
	lon3 float(10,6),
	lat4 float(10,6),
	lon4 float(10,6),
	PRIMARY KEY(id)
);

create table tokens (
	id int AUTO_INCREMENT,
	token char(64) NOT NULL,
	userid int NOT NULL,
	scope ENUM('CLIENT','DRIVER','COMMSERVER','ADMIN'),
	PRIMARY KEY(id),
	foreign key(userid) references usuarios(id) 
) engine=innodb;


create table queue (
	id int AUTO_INCREMENT,
	userid int NOT NULL,
	lat DECIMAL(10,8) NOT NULL,
	lng DECIMAL(10,8) NOT NULL,
	lastUpdate DATETIME NOT NULL,
	PRIMARY KEY(id),
	foreign key(userid) references usuarios(id) 
) engine=innodb;

create user 'taxiserver'@'localhost' IDENTIFIED BY 'taxiserver';
GRANT INSERT,DELETE,SELECT,UPDATE ON taxiserver.* to 'taxiserver'@'localhost';

/*insert into usuarios (usuario,password,nombre,tipo) values ('user1','1234','luser1','DRIVER');*/
/*insert into tokens (token,userid,scope) values ('asdfghjkl',1,'DRIVER');*/
/*insert into usuarios (usuario,password,tipo) values ('comm1','1234','COMMSERVER');*/
/*insert into localizaciones (nombre,lat1,lon1,lat2,lon2,lat3,lon3,lat4,lon4) values ('Prueba',51.50,7.40,51.555,7.40,51.555,7.625,51.5125,7.625);*/

