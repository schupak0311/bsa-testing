import { readFileSync } from 'fs';
import * as uuid from 'uuid';

class CartParser {
	constructor() {
		this.ColumnType = {
			STRING: 'string',
			NUMBER_POSITIVE: 'numberPositive'
		};

		this.ErrorType = {
			HEADER: 'header',
			ROW: 'row',
			CELL: 'cell'
		}

		this.schema = {
			columns: [
				{
					name: 'Product name',
					key: 'name',
					type: this.ColumnType.STRING
				},
				{
					name: 'Price',
					key: 'price',
					type: this.ColumnType.NUMBER_POSITIVE
				},
				{
					name: 'Quantity',
					key: 'quantity',
					type: this.ColumnType.NUMBER_POSITIVE
				}
			]
		}
	}

    /**
     * Synchronously reads the contents of a CSV file and parses it into a JSON object.
     * 
     * @param {string} path absolute path to a CSV file.
     * 
     * @returns a JSON object with cart items and total price.
     */
	parse(path) {
		const
			contents = this.readFile(path),
			validationErrors = this.validate(contents);

		if (validationErrors.length > 0) {
			console.error(validationErrors);
			throw Error('Validation failed!');
		}

		const
			lines = contents.split(/\n/).filter(l => l).filter((l, i) => i > 0),
			items = lines.map(l => this.parseLine(l)),
			total = this.calcTotal(items);

		return {
			items,
			total: Number(total.toFixed(2))
		};
	}

    /**
     * Synchronously reads the entire contents of a file.
     * 
     * @param {string} path absolute path to the file.
     * 
     * @returns {string} contents of the file with UTF-8 encoding.
     */
	readFile(path) {
		return readFileSync(path, 'utf-8', 'r');
	}

    /**
     * Validates the schema of a CSV file.
     * Validation error has the type of the error, row and column index of the CSV file, 
     * a message with a short description of the error.
     * 
     * @param {string} contents contents of the file with UTF-8 encoding.
     * 
     * @returns an array of validation errors. If the array is empty, validation is successful.
     */
	validate(contents) {
		const
			errors = [],
			lines = contents.split(/\n/).filter(l => l),
			headersLine = lines[0],
			bodyLines = lines.filter((l, i) => i > 0);

		const headers = headersLine.split(/,/).map(h => h.trim());

		for (let i = 0; i < this.schema.columns.length; i++) {
			const expectedName = this.schema.columns[i].name;
			if (headers[i] !== expectedName) {
				errors.push(this.createError(
					this.ErrorType.HEADER,
					0,
					i,
					`Expected header to be named "${expectedName}" but received ${headers[i]}.`
				));
			}
		}

		for (let i = 0; i < bodyLines.length; i++) {
			const cells = bodyLines[i].split(/,/).map(c => c.trim());

			if (cells.length < this.schema.columns.length) {
				errors.push(this.createError(
					this.ErrorType.ROW,
					i + 1,
					-1,
					`Expected row to have ${this.schema.columns.length} cells but received ${cells.length}.`
				));
				continue;
			}

			for (let j = 0; j < this.schema.columns.length; j++) {
				const
					cell = cells[j],
					columnType = this.schema.columns[j].type;

				switch (columnType) {
					case this.ColumnType.STRING: {
						if (!cell) {
							errors.push(this.createError(
								this.ErrorType.CELL,
								i + 1,
								j,
								`Expected cell to be a nonempty string but received "${cell}".`
							));
						}
						break;
					}
					case this.ColumnType.NUMBER_POSITIVE: {
						const cellAsNumber = Number(cell);
						if (
							typeof (cellAsNumber) != 'number' ||
							Number.isNaN(cellAsNumber) ||
							cellAsNumber < 0
						) {
							errors.push(this.createError(
								this.ErrorType.CELL,
								i + 1,
								j,
								`Expected cell to be a positive number but received "${cell}".`
							));
						}
						break;
					}
					default: break;
				}
			}
		}

		return errors;
	}

    /**
     * Converts a line from a valid CSV file to a JSON object, which represents a cart item.
     * Adds an `id` property with a uuid as a value to the item.
     * 
     * @param {string} csvLine values separated by comma.
     * 
     * @returns an object with keys from column keys and values from CSV.
     */
	parseLine(csvLine) {
		const
			columns = this.schema.columns,
			types = columns.map(column => column.type),
			keys = columns.map(column => column.key),
			values = csvLine.split(/,/).map(cell => cell.trim()),
			item = {};

		for (let i = 0; i < keys.length; i++) {
			const
				type = types[i],
				key = keys[i],
				value = values[i],
				valueTyped = type === this.ColumnType.NUMBER_POSITIVE ? Number(value) : value;

			item[key] = valueTyped;
		}

		item.id = uuid.v4();

		return item;
	}

    /**
     * Calculates the total price of items added to the cart.
     * 
     * @param {object[]} cartItems items to calculate the total price of.
     * 
     * @returns {number} total price.
     */
	calcTotal(cartItems) {
		return cartItems.reduce(
			(acc, cur) => acc + cur.price * cur.quantity,
			0
		);
	}

    /**
     * Creates and object with parameters as keys and arguments as values.
     * 
     * @param {ErrorType} type category of the error.
     * @param {number} row index of the row in which the error occured.
     * @param {number} column index of the column in which the error occured.
     * @param {string} message error description.
     */
	createError(type, row, column, message) {
		return {
			type, row, column, message
		};
	}
}

export default CartParser;