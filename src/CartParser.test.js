const path = require("path");
import v4 from "uuid";
import fs from "fs";
import CartParser from "./CartParser";

let parser;
let uuid = "uuid";
jest.mock("uuid");
jest.mock("fs");

beforeEach(() => {
  parser = new CartParser();
});

describe("CartParser - unit tests", () => {
  describe("parse", () => {
    beforeAll(() => {
      v4.mockReturnValue(uuid);
    });

    test("should parse correctly with given correct data", () => {
      const contents = `Product name,Price,Quantity
			Mollis consequat,9.00,2
			Tvoluptatem,10.32,1
			Scelerisque lacinia,18.90,1
			Consectetur adipiscing,28.72,10
			Condimentum aliquet,13.90,1	`;

      fs.readFileSync.mockReturnValue(contents);

      const result = parser.parse();
      expect(result).toEqual({
        items: [
          {
            id: uuid,
            name: "Mollis consequat",
            price: 9,
            quantity: 2
          },
          {
            id: uuid,
            name: "Tvoluptatem",
            price: 10.32,
            quantity: 1
          },
          {
            id: uuid,
            name: "Scelerisque lacinia",
            price: 18.9,
            quantity: 1
          },
          {
            id: uuid,
            name: "Consectetur adipiscing",
            price: 28.72,
            quantity: 10
          },
          {
            id: uuid,
            name: "Condimentum aliquet",
            price: 13.9,
            quantity: 1
          }
        ],
        total: 348.32
      });
    });

    test("should return error message when table have incorrect data", () => {
      const contents = `Product name,Priiice,Quantity
		Mollis consequat,9.00,2`;
      fs.readFileSync.mockReturnValue(contents);
      expect(() => parser.parse()).toThrow();
    });
  });

  describe("validate", () => {
    test("should return error when given incorrect header name", () => {
      const incorrectHeaderName = "Priiice";
      const contents = `Product name,${incorrectHeaderName},Quantity
		  Mollis consequat,9.00,2`;

      const expectedName = parser.schema.columns[1].name;
      const expectedError = [
        {
          type: parser.ErrorType.HEADER,
          row: 0,
          column: 1,
          message: `Expected header to be named "${expectedName}" but received ${incorrectHeaderName}.`
        }
      ];

      expect(parser.validate(contents)).toEqual(expectedError);
    });

    test("should return error if row length doesn't match with scheme", () => {
      const contents = `Product name,Price,Quantity
		Mollis consequat,9.00`;
      const incorrectLength = 2;
      const expectedLength = parser.schema.columns.length;
      const expectedError = [
        {
          type: parser.ErrorType.ROW,
          row: 1,
          column: -1,
          message: `Expected row to have ${expectedLength} cells but received ${incorrectLength}.`
        }
      ];

      expect(parser.validate(contents)).toEqual(expectedError);
    });

    test("should return error when receive empty string instead of nonempty", () => {
      const emptyString = "";
      const contents = `Product name,Price,Quantity
		${emptyString},9.00,2`;
      const expectedError = [
        {
          type: parser.ErrorType.CELL,
          row: 1,
          column: 0,
          message: `Expected cell to be a nonempty string but received "${emptyString}".`
        }
      ];

      expect(parser.validate(contents)).toEqual(expectedError);
    });

    test("should return error when receive negative value instead of positive", () => {
      const negativeValue = "-10";
      const contents = `Product name,Price,Quantity
		 Mollis consequat,2,${negativeValue}
		 Tvoluptatem,10.32,1`;
      const expectedError = [
        {
          type: parser.ErrorType.CELL,
          row: 1,
          column: 2,
          message: `Expected cell to be a positive number but received "${negativeValue}".`
        }
      ];

      expect(parser.validate(contents)).toEqual(expectedError);
    });

    test("should not return errors if data valid", () => {
      const contents = `Product name,Price,Quantity
		 Mollis consequat,9.00,2
		 Tvoluptatem,10.32,1`;

      expect(parser.validate(contents)).toHaveLength(0);
    });
  });

  describe("parseLine", () => {
    beforeAll(() => {
      v4.mockReturnValue(uuid);
    });

    test("should parse given line correctly", () => {
      const name = "Mollis consequat",
        price = 9.0,
        quantity = 2;
      const csvLine = `${name},${price},${quantity}`;

      expect(parser.parseLine(csvLine)).toEqual({
        id: uuid,
        name,
        price,
        quantity
      });
    });
  });

  describe("calcTotal", () => {
    test("should return correct total price", () => {
      const cartItems = [
        {
          id: "3e6def17-5e87-4f27-b6b8-ae78948523a9",
          name: "Mollis consequat",
          price: 9,
          quantity: 2
        },
        {
          id: "90cd22aa-8bcf-4510-a18d-ec14656d1f6a",
          name: "Tvoluptatem",
          price: 10.32,
          quantity: 1
        },
        {
          id: "33c14844-8cae-4acd-91ed-6209a6c0bc31",
          name: "Scelerisque lacinia",
          price: 18.9,
          quantity: 1
        }
      ];

      expect(parser.calcTotal(cartItems)).toBeCloseTo(9 * 2 + 10.32 + 18.9);
    });
  });
});

describe("CartParser - integration test", () => {
  beforeAll(() => {
    v4.mockReturnValue(uuid);
    fs.readFileSync.mockImplementationOnce(
      require.requireActual("fs").readFileSync
    );

    test("should parse correctly when given correct data", () => {
      const result = parser.parse(
        path.resolve(__dirname, "../samples/cart.csv")
      );

      expect(result).toEqual({
        items: [
          {
            id: uuid,
            name: "Mollis consequat",
            price: 9.0,
            quantity: 2
          },
          {
            id: uuid,
            name: "Tvoluptatem",
            price: 10.32,
            quantity: 1
          },
          {
            id: uuid,
            name: "Scelerisque lacinia",
            price: 18.9,
            quantity: 1
          },
          {
            id: uuid,
            name: "Consectetur adipiscing",
            price: 28.72,
            quantity: 10
          },
          {
            id: uuid,
            name: "Condimentum aliquet",
            price: 13.9,
            quantity: 1
          }
        ],
        total: 348.32
      });
    });
  });
});
